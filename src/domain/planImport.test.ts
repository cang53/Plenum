import { describe, expect, it } from "vitest";
import { checkLinks, checkRows, parsePlan, planChanges } from "./planImport";

const msp = `<Project xmlns="http://schemas.microsoft.com/project"><Tasks>
<Task><UID>0</UID><Name>Whole job</Name><OutlineLevel>0</OutlineLevel><Summary>1</Summary></Task>
<Task><UID>1</UID><Name>Foundations</Name><OutlineLevel>1</OutlineLevel><Summary>1</Summary></Task>
<Task><UID>2</UID><Name>Dig &amp; pour</Name><OutlineLevel>2</OutlineLevel><Summary>0</Summary><Start>2026-11-02T08:00:00</Start><Finish>2026-11-06T17:00:00</Finish></Task>
<Task><UID>3</UID><Name>Frame</Name><OutlineLevel>1</OutlineLevel><Summary>1</Summary></Task>
<Task><UID>4</UID><Name>Erect</Name><OutlineLevel>2</OutlineLevel><Summary>0</Summary><Start>2026-11-09T08:00:00</Start></Task>
</Tasks></Project>`;

const p6 = `<APIBusinessObjects><WBS><ObjectId>1</ObjectId><Name>Root</Name></WBS>
<WBS><ObjectId>2</ObjectId><ParentObjectId>1</ParentObjectId><Name>Civil</Name></WBS>
<WBS><ObjectId>3</ObjectId><ParentObjectId>2</ParentObjectId><Name>Deep</Name></WBS>
<Activity><Name>Pile</Name><WBSObjectId>3</WBSObjectId><StartDate>2026-11-02T08:00:00</StartDate><FinishDate>2026-11-04T08:00:00</FinishDate></Activity></APIBusinessObjects>`;

const xer = ["ERMHDR\t8.4", "%T\tPROJWBS", "%F\twbs_id\tparent_wbs_id\twbs_name", "%R\t1\t\tRoot", "%R\t2\t1\tMechanical",
  "%T\tTASK", "%F\twbs_id\ttask_name\ttarget_start_date\ttarget_end_date", "%R\t2\tInstall pump\t2026-12-01 08:00\t2026-12-03 16:00", "%E"].join("\n");

describe("parsePlan", () => {
  it("reads MS Project XML: level 1 summaries are phases, the project summary is skipped", () => {
    expect(parsePlan(msp)).toMatchObject({ ok: true, rows: [
      { phase: "Foundations", title: "Dig & pour", start: "2026-11-02", due: "2026-11-06" },
      { phase: "Frame", title: "Erect", start: "2026-11-09", due: null },
    ] });
  });
  it("reads P6 XML, folding deep WBS levels into the level 1 phase", () => {
    expect(parsePlan(p6)).toMatchObject({ ok: true, rows: [{ phase: "Civil", title: "Pile", start: "2026-11-02", due: "2026-11-04" }] });
  });
  it("reads P6 XER", () => {
    expect(parsePlan(xer)).toMatchObject({ ok: true, rows: [{ phase: "Mechanical", title: "Install pump", start: "2026-12-01", due: "2026-12-03" }] });
  });
  it("refuses other files and empty plans", () => {
    expect(parsePlan("hello")).toEqual({ ok: false, error: "import.unknownFormat" });
    expect(parsePlan("ERMHDR\t8.4\n%E")).toEqual({ ok: false, error: "import.empty" });
  });
  it("drops dates that run backwards", () => {
    const r = parsePlan(xer.replace("2026-12-03", "2026-11-03"));
    expect(r.ok && r.rows[0]).toMatchObject({ start: null, due: null });
  });
});

describe("checkRows", () => {
  it("accepts parsed rows and refuses tampered ones", () => {
    const good = [{ phase: "A", title: "T", start: "2026-01-01", due: null }];
    expect(checkRows(good)).toEqual(good);
    expect(checkRows([{ ...good[0], start: "tomorrow" }])).toBeNull();
    expect(checkRows([{ ...good[0], title: " " }])).toBeNull();
    expect(checkRows([])).toBeNull();
  });
});

describe("planChanges", () => {
  const existing = [
    { id: "t1", title: "Pile", phase: "Civil", start: null, due: null },
    { id: "t2", title: "Pour", phase: "Civil", start: "2026-11-02", due: "2026-11-04" },
  ];
  it("creates new tasks, refreshes changed dates, and leaves the rest", () => {
    const rows = [
      { phase: "civil", title: "pile", start: "2026-11-02", due: "2026-11-04" },
      { phase: "Civil", title: "Pour", start: "2026-11-02", due: "2026-11-04" },
      { phase: "Civil", title: "Cure", start: null, due: null },
      { phase: "Civil", title: "Cure", start: null, due: null },
    ];
    expect(planChanges(rows, existing)).toEqual({
      create: [rows[2]], refresh: [{ id: "t1", start: "2026-11-02", due: "2026-11-04" }], unchanged: 1,
    });
  });
});

describe("dependency import", () => {
  const link = (pred: string, type: number, lag = 0) =>
    `<PredecessorLink><PredecessorUID>${pred}</PredecessorUID><Type>${type}</Type><LinkLag>${lag}</LinkLag><LagFormat>7</LagFormat></PredecessorLink>`;
  const mspWith = (links: string) => msp.replace("<Name>Erect</Name>", `<Name>Erect</Name>${links}`).replace("<Project ", "<Project ");
  it("maps MS Project types and lag in days", () => {
    for (const [type, kind] of [[0, "FF"], [1, "FS"], [2, "SF"], [3, "SS"]] as const) {
      const r = parsePlan(mspWith(link("2", type, 9600)));
      expect(r.ok && r.links).toEqual([{ from: 0, to: 1, kind, lag: 2 }]);
    }
  });
  it("maps P6 XML and XER relationships, lag in hours", () => {
    const x = `<Activity><ObjectId>1</ObjectId><Name>A</Name><WBSObjectId>1</WBSObjectId></Activity><Activity><ObjectId>2</ObjectId><Name>B</Name><WBSObjectId>1</WBSObjectId></Activity>
<Relationship><PredecessorActivityObjectId>1</PredecessorActivityObjectId><SuccessorActivityObjectId>2</SuccessorActivityObjectId><Type>Start to Start</Type><Lag>16</Lag></Relationship>`;
    const r = parsePlan(x);
    expect(r.ok && r.links).toEqual([{ from: 0, to: 1, kind: "SS", lag: 2 }]);
    const xr = parsePlan(["ERMHDR\t8.4", "%T\tTASK", "%F\twbs_id\ttask_id\ttask_name", "%R\t1\t10\tA", "%R\t1\t11\tB",
      "%T\tTASKPRED", "%F\ttask_id\tpred_task_id\tpred_type\tlag_hr_cnt", "%R\t11\t10\tPR_FF\t-8", "%E"].join("\n"));
    expect(xr.ok && xr.links).toEqual([{ from: 0, to: 1, kind: "FF", lag: -1 }]);
  });
  it("lists unsupported links instead of dropping them", () => {
    const r = parsePlan(mspWith(link("2", 9) + link("77", 1) + link("2", 1, 5).replace("<LagFormat>7", "<LagFormat>19")));
    expect(r.ok && r.links).toEqual([]);
    expect(r.ok && r.skipped.map((s) => s.reason)).toEqual(["type", "task", "lag"]);
  });
  it("refuses a file whose links loop", () => {
    const two = `<Activity><ObjectId>1</ObjectId><Name>A</Name><WBSObjectId>1</WBSObjectId></Activity><Activity><ObjectId>2</ObjectId><Name>B</Name><WBSObjectId>1</WBSObjectId></Activity>`;
    const rel = (a: number, b: number) => `<Relationship><PredecessorActivityObjectId>${a}</PredecessorActivityObjectId><SuccessorActivityObjectId>${b}</SuccessorActivityObjectId><Type>Finish to Start</Type><Lag>0</Lag></Relationship>`;
    expect(parsePlan(two + rel(1, 2) + rel(2, 1))).toEqual({ ok: false, error: "import.cycle" });
  });
  it("checks links again on apply", () => {
    const good = [{ from: 0, to: 1, kind: "SS", lag: 1 }];
    expect(checkLinks(good, 2)).toEqual(good);
    expect(checkLinks([{ from: 0, to: 2, kind: "FS", lag: 0 }], 2)).toBeNull();
    expect(checkLinks([{ from: 0, to: 1, kind: "XX", lag: 0 }], 2)).toBeNull();
    expect(checkLinks([...good, { from: 1, to: 0, kind: "FS", lag: 0 }], 2)).toBeNull();
  });
});
