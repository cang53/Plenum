import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { t } from "@/lib/messages";
import { Gantt } from "./Gantt";

const labels = { chart: "Gantt chart", today: "Today", critical: "On the critical path", conflict: "Starts early", print: "Print", saveError: "Error", bar: t("gantt.bar"), empty: "No dated tasks", saveBaseline: "Save baseline", baselineName: "Baseline name", baselineSaved: "Saved", baselineNone: "No baseline yet", baselineLate: "{n} tasks late", slip: "{days} days against the baseline", milestone: "Milestone", task: "Task", start: "Start", end: "End", zoom: "Zoom", week: "Week", month: "Month", quarter: "Quarter", collapse: "Collapse phase", expand: "Expand phase", noPhase: "No phase", slipShort: "+{days} d", criticalToggle: "Critical path" };
const task = (id: string, startDate: string, dueDate: string) => ({ id, title: id, startDate, dueDate, phase: null });
const save = async () => {};

describe("Gantt", () => {
  it("shows the empty message without dated tasks", () => {
    const html = renderToStaticMarkup(<Gantt tasks={[{ id: "a", title: "a", startDate: null, dueDate: null, phase: null }]} dependencies={[]} onSave={save} labels={labels} />);
    expect(html).toContain("No dated tasks");
  });
  it("renders a labelled chart with one named bar per dated task and marks the critical path", () => {
    const html = renderToStaticMarkup(<Gantt tasks={[task("a", "2026-11-01", "2026-11-03"), task("b", "2026-11-04", "2026-11-06")]} dependencies={[{ predecessorId: "a", successorId: "b" }]} onSave={save} labels={labels} />);
    const named = t("gantt.bar").replace("{title}", "a").replace("{start}", "2026-11-01").replace("{due}", "2026-11-03");
    expect(html).toContain(labels.chart);
    expect(html).toContain(`${named}. ${labels.critical}`);
    expect(html.match(/class="gantt-bar"/g)).toHaveLength(2);
    expect(html).toContain("Print");
  });
  it("has an off critical path toggle and draws no arrows until a task is selected", () => {
    const html = renderToStaticMarkup(<Gantt tasks={[task("a", "2026-11-01", "2026-11-03"), task("b", "2026-11-04", "2026-11-06")]} dependencies={[{ predecessorId: "a", successorId: "b" }]} onSave={save} labels={labels} />);
    expect(html).toContain('aria-pressed="false">Critical path');
    expect(html).toContain('data-critical-path="false"');
    expect(html).not.toContain("<path");
  });
  it("draws a milestone as a marked, labelled bar", () => {
    const html = renderToStaticMarkup(<Gantt tasks={[{ ...task("m", "2026-11-01", "2026-11-03"), isMilestone: true }]} dependencies={[]} onSave={save} labels={labels} />);
    expect(html).toContain('data-milestone="true"');
    expect(html).toContain(". Milestone");
  });
  it("lists tasks in a table with a summary row per phase and a zoom control", () => {
    const html = renderToStaticMarkup(<Gantt tasks={[{ ...task("a", "2026-11-01", "2026-11-03"), phase: "Build" }, { ...task("b", "2026-11-04", "2026-11-06"), phase: "Build" }]} dependencies={[]} onSave={save} labels={labels} />);
    expect(html).toContain('data-summary="true"');
    expect(html).toContain("Collapse phase: Build");
    expect(html).toContain('aria-pressed="true">Month');
    expect(html.match(/class="gantt-summary"/g)).toHaveLength(1);
  });
  it("shows slip against a baseline and the save button only when allowed", () => {
    const tasks = [task("a", "2026-11-01", "2026-11-05")];
    const base = { a: { startDate: "2026-11-01", dueDate: "2026-11-03" } };
    const html = renderToStaticMarkup(<Gantt tasks={tasks} dependencies={[]} onSave={save} baseline={base} onBaseline={async () => {}} labels={labels} />);
    expect(html).toContain("2 days against the baseline");
    expect(html).toContain("1 tasks late");
    expect(html).toContain("+2 d");
    expect(html).toContain("Save baseline");
    expect(html).toContain("Baseline name");
    expect(renderToStaticMarkup(<Gantt tasks={tasks} dependencies={[]} onSave={save} labels={labels} />)).not.toContain("Save baseline");
  });
});
