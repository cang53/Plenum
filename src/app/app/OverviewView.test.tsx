import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { t } from "@/lib/messages";
import { OverviewView, type OverviewData } from "./OverviewView";

const data: OverviewData = {
  projectName: "Pump", dateLabel: "Tuesday", timelineHref: "/tl", reviewHref: "/rv",
  health: { label: "At risk", tone: "warn", note: "Gearbox is late", author: "Marta", dateLabel: "27 Oct" },
  attention: [{ id: "a", title: "Gearbox delivery", href: "/b", chip: "Blocked", tone: "bad", meta: "Marta · 28 Nov" }],
  suggestion: { title: "Resequence install", details: "d", reason: "The supplier moved delivery", href: "/src" },
  percent: 40, counts: { done: 2, in_progress: 1, blocked: 1, todo: 1 }, overdue: 1,
  upcoming: [{ id: "u1", title: "Drawings", href: "/b", day: "7 Nov", soon: true, meta: "In progress" }, { id: "u2", title: "Tests", href: "/b", day: "8 Dec", soon: false, meta: "To do" }],
  events: [{ text: "Permit approved", dateLabel: "27 Oct" }], address: "pump@in.example",
};
const render = (d: OverviewData) => renderToStaticMarkup(<OverviewView t={t} data={d} />);

describe("OverviewView", () => {
  it("shows health, attention, the suggestion with its source link, counts and the project address", () => {
    const html = render(data);
    for (const s of ["Project health", "Gearbox is late", "Gearbox delivery", "Blocked", "Resequence install", 'href="/src"', "40%", "1 overdue", "Later", "Permit approved", "pump@in.example"]) expect(html).toContain(s);
  });
  it("leaves out the suggestion card, review button, activity and address when there is nothing to show", () => {
    const html = render({ ...data, suggestion: null, events: [], address: null, health: null, attention: [], overdue: 0 });
    for (const s of ["AI suggestion", "Review suggestions", "Recent project activity", "Project email address", "1 overdue"]) expect(html).not.toContain(s);
    expect(html).toContain("No update yet");
  });
});

describe("overview.css", () => {
  const css = readFileSync(new URL("../overview.css", import.meta.url), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
  it("uses tokens only, no raw colors", () => expect(css).not.toMatch(/#[0-9a-f]{3,8}\b|rgba?\(/i));
});
