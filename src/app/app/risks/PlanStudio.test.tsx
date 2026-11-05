import { writeFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { baseLoad, type Draft, type Person } from "@/domain/planStudio";
import { t } from "@/lib/messages";
import { PlanStudio } from "./PlanStudio";
import { STUDIO_KEYS } from "./studioLabels";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: () => {} }) }));
vi.mock("./studio-actions", () => ({ studioChat: vi.fn(), studioCommit: vi.fn(), studioFromNotes: vi.fn() }));

const labels = Object.fromEntries(STUDIO_KEYS.map((k) => [k, t(k)])) as Record<(typeof STUDIO_KEYS)[number], string>;
const people: Person[] = [{ userId: "a", name: "Mila V.", role: "member" }, { userId: "b", name: "Jan K.", role: "project_manager" }, { userId: "c", name: "Sam D.", role: "member" }];
const weekNames = ["W45", "W46", "W47", "W48", "W49", "W50", "W51", "W52"];
const base = baseLoad(people, [{ title: "x", startDate: "2026-11-02", dueDate: "2026-11-13", ownerId: "a" }, { title: "y", startDate: "2026-11-02", dueDate: "2026-12-04", ownerId: "b" }], "2026-11-02");
const steps: Draft[] = [
  { id: 1, title: "Place order early", s: 0, l: 2, owner: "a", why: "Ordering before design freeze saved 2 weeks at North Yard." },
  { id: 2, title: "Weekly supplier call", s: 1, l: 6, owner: "b", why: "Late discovery cost 3 to 4 weeks at Harbor Lights." },
  { id: 3, title: "Backup supplier quote", s: 2, l: 2, owner: null, why: "" },
];
const render = (initialSteps: Draft[]) => renderToStaticMarkup(<PlanStudio riskId="r" weekStart="2026-11-02" people={people} weekNames={weekNames} existing={[{ title: "Cabling order", s: 0, l: 4 }, { title: "Site install", s: 4, l: 4 }]} base={base} labels={labels} canManage initialSteps={initialSteps} />);

describe("PlanStudio", () => {
  it("starts empty with the agent greeting and a propose chip", () => {
    const html = render([]);
    expect(html).toContain(labels["ps.hello"]);
    expect(html).toContain(labels["ps.chip.propose"]);
    expect(html).toContain(labels["ps.stepsEmpty"]);
    expect(html).toMatch(/<button[^>]*disabled[^>]*>Add to timeline<\/button>/);
  });
  it("shows hatched bars, owners with roles, and a gap for a step nobody owns", () => {
    const html = render(steps);
    expect(html.match(/ps-bar new/g)).toHaveLength(3);
    expect(html).toMatch(/ps-bar new ps-c2 gap/);
    expect(new Set(html.match(/ps-bar new ps-c\d/g)).size).toBe(3);
    expect(html).toContain("Mila V. · Member");
    expect(html).toContain(labels["ps.gap"]);
    expect(html).toContain("Add 3 to timeline");
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
    const html = renderToStaticMarkup(<PlanStudio riskId="r" weekStart="2026-11-02" people={people} weekNames={weekNames} existing={[]} base={base} labels={labels} canManage initialSteps={steps} initialLog={[{ who: "me", text: "Propose a plan" }, { who: "ai", text: "Here is a plan" }]} />);
    expect(html).toContain("Here is a plan");
    expect(html).not.toContain(labels["ps.hello"]);
    expect(html).toContain("3 activities added to the timeline");
  });
  it("opens on the affected activity and can move earlier or later", () => {
    const html = renderToStaticMarkup(<PlanStudio riskId="r" people={people} weekNames={weekNames} weekStart="2026-11-02" startAt={3} existing={[{ title: "Install", s: 3, l: 2, hot: true }, { title: "Old", s: -2, l: 1 }]} base={base} labels={labels} canManage />);
    expect(html).toContain("W48"); // first visible week is week 3 from this Monday
    expect(html).toContain(`left:0%;width:25%`); // the affected bar sits at the left edge
    expect(html).toContain(labels["ps.earlier"]);
    expect(html).toContain(labels["ps.later"]);
  });
});
