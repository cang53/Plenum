import type { MessageKey } from "@/lib/messages";

const KEYS = [
  "timelines.cancel", "timelines.readOnly", "timelines.save", "timelines.saving", "timelines.saved", "timelines.unsaved", "timelines.saveError", "timelines.undo", "timelines.redo", "timelines.exportPdf", "timelines.back",
  "timelines.canvas", "timelines.tools", "timelines.tool.bar", "timelines.tool.milestone", "timelines.tool.row", "timelines.tool.bracket", "timelines.tool.shade", "timelines.tool.arrow", "timelines.fromGantt", "timelines.refresh",
  "timelines.gantt.hint", "timelines.gantt.none", "timelines.gantt.add", "timelines.milestones", "timelines.link", "timelines.panel.item", "timelines.panel.slide", "timelines.panel.none",
  "timelines.f.text", "timelines.f.start", "timelines.f.end", "timelines.f.date", "timelines.f.colour", "timelines.f.hex", "timelines.f.shape", "timelines.f.progress", "timelines.f.row", "timelines.f.owner", "timelines.f.activity", "timelines.f.from", "timelines.f.to",
  "timelines.shape.pill", "timelines.shape.square", "timelines.shape.arrow", "timelines.item.remove", "timelines.row.up", "timelines.row.down",
  "timelines.s.title", "timelines.s.subtitle", "timelines.s.scale", "timelines.scale.week", "timelines.scale.month", "timelines.scale.quarter", "timelines.scale.year", "timelines.s.today", "timelines.s.legend", "timelines.s.owner", "timelines.s.show", "timelines.s.hide",
  "timelines.s.font", "timelines.font.sans", "timelines.font.serif", "timelines.font.mono", "timelines.s.fontSize", "timelines.s.page", "timelines.page.169", "timelines.page.a4", "timelines.page.letter", "timelines.s.background", "timelines.s.textColour",
  "timelines.s.rangeStart", "timelines.s.rangeEnd", "timelines.s.rangeAuto", "timelines.s.legendEntries", "timelines.s.legendAdd", "timelines.today", "timelines.meta",
] as const satisfies readonly MessageKey[];
export type TimelineLabels = Record<(typeof KEYS)[number], string>;

// A function cannot cross from the server page to the editor, so the strings are looked up here.
export function timelineLabels(t: (key: MessageKey) => string): TimelineLabels {
  return Object.fromEntries(KEYS.map((k) => [k, t(k)])) as TimelineLabels;
}
