import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { cleanDoc } from "@/domain/tlDoc";
import { layoutTimeline } from "@/domain/tlLayout";
import { t as tr, type MessageKey } from "@/lib/messages";
import { timelineLabels } from "./labels";
import { SlideSvg } from "./SlideSvg";
import { TimelineEditor } from "./TimelineEditor";

const labels = timelineLabels((k: MessageKey) => tr(k));
const doc = cleanDoc({
  title: "Dock 3 refit", rows: [{ id: "r1", label: "Build", owner: "Jo" }],
  items: [{ id: "b1", kind: "bar", row: "r1", label: "Hull works", start: "2026-12-01", end: "2027-01-20", color: "#4f46e5" }],
});
const props = { id: "t1", listHref: "/app/timelines?project=p", initial: doc, tasks: [], canEdit: true, labels, locale: "en-GB", today: "2026-12-20", author: "Ada", createdAt: "2026-11-02T10:00:00Z", updatedAt: "2026-11-04T10:00:00Z", save: async () => ({ updatedAt: "" }) };

describe("TimelineEditor", () => {
  it("shows the slide, the tools and the slide settings", () => {
    const h = renderToStaticMarkup(<TimelineEditor {...props} />);
    expect(h).toContain("Hull works");
    for (const k of ["timelines.tool.bar", "timelines.tool.milestone", "timelines.tool.bracket", "timelines.tool.shade", "timelines.fromGantt", "timelines.exportPdf", "timelines.s.today", "timelines.s.scale"] as const) expect(h).toContain(labels[k]);
    expect(h).toContain(labels["timelines.meta"].replace("{author}", "Ada").replace("{created}", "2 Nov 2026").replace("{updated}", "4 Nov 2026"));
  });
  it("is read-only for people who may not edit, but still exports", () => {
    const h = renderToStaticMarkup(<TimelineEditor {...props} canEdit={false} />);
    expect(h).toContain(labels["timelines.readOnly"]);
    expect(h).not.toContain(labels["timelines.tool.bar"] + "</button>");
    expect(h).not.toContain(`>${labels["timelines.save"]}</button>`);
    expect(h).toContain(labels["timelines.exportPdf"]);
  });
  it("lists only Gantt tasks that are not on the timeline yet", () => {
    const task = (id: string, title: string) => ({ id, title, startDate: "2026-12-01", dueDate: "2026-12-05", isMilestone: false, status: "todo", ownerName: null });
    const h = renderToStaticMarkup(<TimelineEditor {...props} tasks={[task("a", "Paint hull"), { ...task("b", "No dates"), startDate: null, dueDate: null }]} />);
    expect(h).toContain("Paint hull");
    expect(h).not.toContain("No dates");
  });
});

describe("SlideSvg", () => {
  const layout = layoutTimeline(doc, "2026-12-20", { today: "Today", activity: "Activity", owner: "Owner", locale: "en-GB" });
  it("draws the items and marks the selected one", () => {
    const plain = renderToStaticMarkup(<SlideSvg layout={layout} label="x" />);
    expect(plain).toContain("<svg");
    expect(plain).toContain("Hull works");
    expect(plain).not.toContain("stroke-dasharray=\"4 3\"");
    expect(renderToStaticMarkup(<SlideSvg layout={layout} label="x" selected="b1" />)).toContain("stroke-dasharray=\"4 3\"");
  });
});
