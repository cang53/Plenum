import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { t } from "@/lib/messages";
import { OverviewView, type OverviewData } from "./OverviewView";

const data: OverviewData = {
  projectName: "Pump", dateLabel: "Tuesday", headline: "Pump is at risk", timelineHref: "/tl", reviewHref: "/rv", newTaskHref: "/new", membersHref: "/m",
  health: { label: "At risk", tone: "warn", note: "Gearbox is late", author: "Marta", dateLabel: "27 Oct" },
  attention: [{ id: "a", title: "Gearbox delivery", href: "/b", chip: "Blocked", tone: "bad", meta: "Marta · 28 Nov" }],
  suggestion: { title: "Resequence install", details: "d", reason: "The supplier moved delivery", href: "/src" }, waiting: 1,
  percent: 40, counts: { done: 2, in_progress: 1, blocked: 1, todo: 1 }, overdue: 1,
  nextMilestone: { title: "Energise", days: 12 }, risks: { open: 3, high: 1 },
  phases: [{ name: "Civil", label: "In progress", tone: "info", percent: 58, finish: "6 Dec" }],
  week: [{ key: "todo", label: "To do", count: 1, tasks: [{ id: "w1", title: "Order pump", href: "/b", chip: "High", tone: "bad", date: "9 Nov", initials: "MK" }] }],
  calendar: { title: "November 2026", prevHref: "/p", nextHref: "/n", days: ["Mon"], cells: [{ n: 1, today: true, milestone: true }] },
  team: [{ initials: "MK", name: "Marta K", role: "Member" }], teamTotal: 6,
  events: [{ text: "Permit approved", dateLabel: "27 Oct" }],
};
const render = (d: OverviewData) => renderToStaticMarkup(<OverviewView t={t} data={d} />);

describe("OverviewView", () => {
  it("shows the headline, metrics, phases, week, decisions with the source link, and the team", () => {
    const html = render(data);
    for (const s of ["Pump is at risk", "40%", "12", "Complete overall", "Open risks, 1 high", "Civil", "58%", "Order pump", "November 2026", "Resequence install", 'href="/src"', "Gearbox delivery", "Marta K", "See everyone", "Permit approved", "1 overdue"]) expect(html).toContain(s);
    expect(html).not.toContain("pump@in.example");
  });
  it("links the review button, never applies from the Overview", () => {
    const html = render(data);
    expect(html).toContain('href="/rv"');
    expect(html).not.toContain("Apply");
  });
  it("leaves out the suggestion, phases, activity when there is nothing to show", () => {
    const html = render({ ...data, suggestion: null, phases: [], events: [], health: null, attention: [], overdue: 0, nextMilestone: null });
    for (const s of ["Resequence install", "Progress by group", "Recent project activity", "1 overdue"]) expect(html).not.toContain(s);
    expect(html).toContain("Nothing is waiting for you.");
    expect(html).toContain("No upcoming milestone");
  });
});

describe("overview.css", () => {
  const css = readFileSync(new URL("../overview.css", import.meta.url), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
  it("uses tokens only, no raw colors", () => expect(css).not.toMatch(/#[0-9a-f]{3,8}\b|rgba?\(/i));
});
