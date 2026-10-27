import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { t } from "@/lib/messages";
import { demoGantt } from "@/data/demo";
import { Gantt } from "./Gantt";

const labels = { chart: "Gantt chart", today: "Today", critical: "On the critical path", conflict: "Starts early", print: "Print", saveError: "Error", bar: t("gantt.bar"), empty: "No dated tasks", saveBaseline: "Save baseline", baselineName: "Baseline name", baselineSaved: "Saved", baselineNone: "No baseline yet", baselineLate: "{n} tasks late", slip: "{days} days against the baseline", milestone: "Milestone", task: "Task", start: "Start", end: "End", zoom: "Zoom", week: "Week", month: "Month", quarter: "Quarter", collapse: "Collapse phase", expand: "Expand phase", noPhase: "No phase", slipShort: "+{days} d", baselineActive: "Baseline: {name}.", baselineLegend: "Baseline dates", criticalToggle: "Critical path" };
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
    expect(html).toContain('aria-pressed="true">Week');
    expect(html.match(/class="gantt-summary"/g)).toHaveLength(1);
  });
  it("shows slip against a baseline and the save button only when allowed", () => {
    const tasks = [task("a", "2026-11-01", "2026-11-05")];
    const base = { a: { startDate: "2026-11-01", dueDate: "2026-11-03" } };
    const html = renderToStaticMarkup(<Gantt tasks={tasks} dependencies={[]} onSave={save} baseline={base} baselineName="Kick-off" onBaseline={async () => {}} labels={labels} />);
    expect(html).toContain("2 days against the baseline");
    expect(html).toContain('data-static="true">Baseline: Kick-off</span>');
    expect(html).toContain("1 tasks late");
    expect(html).toContain('data-baseline="true"');
    expect(html).toContain("+2 d");
    expect(html).toContain("Save baseline");
    expect(html).toContain("Baseline name");
    expect(renderToStaticMarkup(<Gantt tasks={tasks} dependencies={[]} onSave={save} labels={labels} />)).not.toContain("Save baseline");
  });
  it("shows owner, number, status and priority in the task column and a symbol on each bar", () => {
    const html = renderToStaticMarkup(<Gantt tasks={[{ ...task("a", "2026-11-01", "2026-11-03"), ownerName: "Aylin Kaya", number: 7, status: "in_progress", priority: "high" }]} dependencies={[]} onSave={save} labels={labels} prefix="P" />);
    expect(html).toContain("Aylin Kaya · P-7");
    expect(html).toContain("In progress · High");
    expect(html).toContain('data-status="in_progress"');
    expect(html).toContain("◐");
  });
  it("marks a late successor and draws a forecast as a dashed box with its label", () => {
    const { tasks, dependencies } = demoGantt(new Date("2026-10-27T12:00:00Z"));
    const html = renderToStaticMarkup(<Gantt tasks={tasks} dependencies={dependencies} labels={labels} />);
    expect(html).toContain('data-late="true"');
    expect(html).toContain('class="gantt-forecast"');
    expect(html).toContain("not accepted");
    expect(html).toContain("After Lifting works");
  });
  it("shows a pending risk with its source and review link, and always the approval policy", () => {
    const risk = { title: "Load chart mismatch", quote: "Check before Friday.", source: "Jonas", sourceHref: "/s", reviewHref: "/r" };
    const html = renderToStaticMarkup(<Gantt tasks={[task("a", "2026-11-01", "2026-11-03")]} dependencies={[]} labels={labels} risk={risk} />);
    expect(html).toContain("Load chart mismatch");
    expect(html).toContain('href="/s"');
    expect(html).toContain('href="/r"');
    expect(html).toContain("never changes the schedule until a person accepts");
    expect(renderToStaticMarkup(<Gantt tasks={[task("a", "2026-11-01", "2026-11-03")]} dependencies={[]} labels={labels} />)).not.toContain("gantt-risk");
  });
});
