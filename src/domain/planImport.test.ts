import { describe, expect, it } from "vitest";
import { checkRows, parsePlan, planChanges } from "./planImport";

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
    expect(parsePlan(msp)).toEqual({ ok: true, rows: [
      { phase: "Foundations", title: "Dig & pour", start: "2026-11-02", due: "2026-11-06" },
      { phase: "Frame", title: "Erect", start: "2026-11-09", due: null },
    ] });
  });
  it("reads P6 XML, folding deep WBS levels into the level 1 phase", () => {
    expect(parsePlan(p6)).toEqual({ ok: true, rows: [{ phase: "Civil", title: "Pile", start: "2026-11-02", due: "2026-11-04" }] });
  });
  it("reads P6 XER", () => {
    expect(parsePlan(xer)).toEqual({ ok: true, rows: [{ phase: "Mechanical", title: "Install pump", start: "2026-12-01", due: "2026-12-03" }] });
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
