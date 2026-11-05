import { writeFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { baseLoad, type Draft, type Person } from "@/domain/planStudio";
import { t } from "@/lib/messages";
import { ganttLabels } from "@/app/app/gantt/labels";
import { PlanStudio } from "./PlanStudio";
import { STUDIO_KEYS } from "./studioLabels";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: () => {} }) }));
vi.mock("./studio-actions", () => ({ studioChat: vi.fn(), studioCommit: vi.fn(), studioFromNotes: vi.fn() }));

const labels = Object.fromEntries(STUDIO_KEYS.map((k) => [k, t(k)])) as Record<(typeof STUDIO_KEYS)[number], string>;
const gantt = { groups: [], tasks: [{ id: "t1", title: "Install conveyor", startDate: "2026-11-09", dueDate: "2026-11-20", phase: null, ownerName: "Mila V." }], dependencies: [], labels: ganttLabels((k) => t(k)), locale: "en" as const, prefix: "T", focusId: "t1" };
const people: Person[] = [{ userId: "a", name: "Mila V.", role: "member" }, { userId: "b", name: "Jan K.", role: "project_manager" }, { userId: "c", name: "Sam D.", role: "member" }];
const weekNames = ["W45", "W46", "W47", "W48", "W49", "W50", "W51", "W52"];
const base = baseLoad(people, [{ title: "x", startDate: "2026-11-02", dueDate: "2026-11-13", ownerId: "a" }, { title: "y", startDate: "2026-11-02", dueDate: "2026-12-04", ownerId: "b" }], "2026-11-02");
const steps: Draft[] = [
  { id: 1, title: "Place order early", s: 0, l: 2, owner: "a", why: "Ordering before design freeze saved 2 weeks at North Yard." },
  { id: 2, title: "Weekly supplier call", s: 1, l: 6, owner: "b", why: "Late discovery cost 3 to 4 weeks at Harbor Lights." },
  { id: 3, title: "Backup supplier quote", s: 2, l: 2, owner: null, why: "" },
];
const render = (initialSteps: Draft[]) => renderToStaticMarkup(<PlanStudio riskId="r" weekStart="2026-11-02" gantt={gantt} people={people} weekNames={weekNames} existing={[{ title: "Cabling order", s: 0, l: 4 }, { title: "Site install", s: 4, l: 4 }]} base={base} labels={labels} canManage initialSteps={initialSteps} />);

describe("PlanStudio", () => {
  it("starts empty with the agent greeting and a propose chip", () => {
    const html = render([]);
    expect(html).toContain(labels["ps.hello"]);
    expect(html).toContain(labels["ps.chip.propose"]);
    expect(html).toContain(labels["ps.stepsEmpty"]);
    expect(html).toMatch(/<button[^>]*disabled[^>]*>Add to Gantt<\/button>/);
  });
  it("puts proposed steps in a Remediation plan group inside the affected activity's group", () => {
    const g = { ...gantt, anchor: "t1", groups: [{ id: "proc", name: "Procurement", parentId: null }], tasks: [{ ...gantt.tasks[0], phase: "Procurement", phaseId: "proc" }] };
    const html = renderToStaticMarkup(<PlanStudio riskId="r" weekStart="2026-11-02" gantt={g} people={people} weekNames={weekNames} existing={[]} base={base} labels={labels} canManage initialSteps={steps} />);
    expect(html).toContain(`${labels["ps.group"]}</button>`);
    expect(html.indexOf("Procurement</button>")).toBeGreaterThan(-1);
    expect(html.indexOf("Procurement</button>")).toBeLessThan(html.indexOf(`${labels["ps.group"]}</button>`));
  });
  it("shows hatched bars, owners with roles, and a gap for a step nobody owns", () => {
    const html = render(steps);
    expect(new Set(html.match(/gantt-proposal ps-c\d/g)).size).toBe(3);
    expect(html).toContain("Mila V. · Member");
    expect(html).toContain(labels["ps.gap"]);
    expect(html).toContain("Add 3 to Gantt");
    if (process.env.PLAN_STUDIO_HTML) writeFileSync(process.env.PLAN_STUDIO_HTML, html);
  });
});

describe("remediation snapshot", () => {
  it("has the labels the saved plan view uses", () => {
    for (const k of ["risks.remediation.in_remediation", "risks.snapshot", "risks.snapshotChat"] as const) expect(t(k)).toBeTruthy();
  });
});

describe("saved plan", () => {
  it("comes back with its chat and the add button done", () => {
    const html = renderToStaticMarkup(<PlanStudio riskId="r" weekStart="2026-11-02" gantt={gantt} people={people} weekNames={weekNames} existing={[]} base={base} labels={labels} canManage initialSteps={steps} initialLog={[{ who: "me", text: "Propose a plan" }, { who: "ai", text: "Here is a plan" }]} />);
    expect(html).toContain("Here is a plan");
    expect(html).not.toContain(labels["ps.hello"]);
    expect(html).toContain("3 activities added to the Gantt");
  });
  it("shows an added step once, in green, on the real task", () => {
    const dup = { title: "Place order early", startDate: "2026-11-02", dueDate: "2026-11-13", phase: null, ownerName: "Mila V." };
    const real = { ...gantt, tasks: [...gantt.tasks, { id: "t2", ...dup }, { id: "t3", ...dup }] }; // same title twice: only the saved id is green
    const html = renderToStaticMarkup(<PlanStudio riskId="r" weekStart="2026-11-02" gantt={real} people={people} weekNames={weekNames} existing={[]} base={base} labels={labels} canManage initialSteps={[{ ...steps[0], taskId: "t3" }]} initialLog={[{ who: "ai", text: "ok" }]} />);
    expect(html.match(/Place order early/g)?.length).toBeGreaterThan(0);
    expect(html).toContain("gantt-proposal ps-ok");
    expect(html).not.toContain('data-bar-id="p-1"');
    expect(html.match(/gantt-proposal ps-ok/g)).toHaveLength(1);
    expect(html).toMatch(/data-bar-id="t3"/);
  });
  it("draws the real chart with the existing activities and each proposal in its own color", () => {
    const html = render(steps);
    expect(html).toContain("Install conveyor");
    expect(html).toContain('data-embedded="true"');
    expect(html).toContain("gantt-proposal ps-c0");
    expect(html).toContain("gantt-proposal ps-c2");
    expect(html).toContain(labels["ps.proposed"]);
    expect(html).toContain("data-muted"); // other activities go grey while a plan is proposed
    expect(render([])).not.toContain("data-muted");
  });
});
