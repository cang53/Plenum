import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { t } from "@/lib/messages";
import { Gantt } from "./Gantt";

const labels = { chart: "Gantt chart", today: "Today", critical: "On the critical path", conflict: "Starts early", print: "Print", saveError: "Error", bar: t("gantt.bar"), empty: "No dated tasks" };
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
});
