import { describe, expect, it } from "vitest";
import { addFromGantt, cleanDoc, emptyDoc, refreshFromGantt, type GanttTask } from "./tlDoc";

const task = (o: Partial<GanttTask>): GanttTask => ({ id: "t1", title: "Hull works", startDate: "2026-12-01", dueDate: "2027-01-20", isMilestone: false, status: "in_progress", ownerName: "Jo", ...o });

describe("cleanDoc", () => {
  it("falls back to an empty document for anything odd", () => {
    for (const bad of [null, 5, "x", [], undefined]) expect(cleanDoc(bad, "T").rows).toEqual([]);
    expect(cleanDoc(null, "T").title).toBe("T");
  });
  it("replaces bad style values and drops unknown fields", () => {
    const d = cleanDoc({ scale: "decade", fontSize: 999, background: "red", font: "comic", evil: 1, page: "a4" });
    expect([d.scale, d.fontSize, d.background, d.font, d.page]).toEqual(["month", 24, "#ffffff", "sans", "a4"]);
    expect(d).not.toHaveProperty("evil");
  });
  it("keeps only items whose row exists, fixes reversed dates and unknown kinds", () => {
    const d = cleanDoc({ rows: [{ id: "r1", label: "A" }], items: [
      { id: "b1", kind: "bar", row: "r1", label: "x", start: "2026-12-10", end: "2026-12-01", color: "#112233" },
      { id: "b2", kind: "bar", row: "nope", start: "2026-12-10", end: "2026-12-11" },
      { id: "z", kind: "script", row: "r1" },
      { id: "m1", kind: "milestone", row: "r1", date: "2026-02-30" },
    ] });
    expect(d.items.map((i) => i.id)).toEqual(["b1", "m1"]);
    expect(d.items[0]).toMatchObject({ start: "2026-12-01", end: "2026-12-10", shape: "pill" });
  });
  it("drops arrows that do not join two different bars and duplicate ids", () => {
    const d = cleanDoc({ rows: [{ id: "r1" }, { id: "r1" }], items: [
      { id: "a", kind: "bar", row: "r1", start: "2026-12-01", end: "2026-12-02" }, { id: "b", kind: "bar", row: "r1", start: "2026-12-03", end: "2026-12-04" },
      { id: "x1", kind: "arrow", from: "a", to: "b" }, { id: "x2", kind: "arrow", from: "a", to: "a" }, { id: "x3", kind: "arrow", from: "a", to: "gone" },
    ] });
    expect(d.rows).toHaveLength(1);
    expect(d.items.map((i) => i.id)).toEqual(["a", "b", "x1"]);
  });
  it("caps rows and items", () => {
    const rows = Array.from({ length: 150 }, (_, i) => ({ id: `r${i}`, label: "x" }));
    expect(cleanDoc({ rows }).rows).toHaveLength(100);
  });
});

describe("Gantt link", () => {
  it("adds a row and bar per task and a milestone on a shared row, once", () => {
    const once = addFromGantt(emptyDoc("T"), [task({}), task({ id: "t2", title: "Signed", isMilestone: true, dueDate: "2026-11-18", startDate: null }), task({ id: "t3", startDate: null, dueDate: null })], "Milestones");
    expect(once.rows.map((r) => r.label)).toEqual(["Hull works", "Milestones"]);
    expect(once.items.map((i) => i.kind)).toEqual(["bar", "milestone"]);
    expect(once.items[0]).toMatchObject({ taskId: "t1", start: "2026-12-01", end: "2027-01-20" });
    const twice = addFromGantt(once, [task({})], "Milestones");
    expect(twice.items).toHaveLength(2);
  });
  it("refreshes dates and names on request and keeps the style", () => {
    const doc = addFromGantt(emptyDoc("T"), [task({})], "M");
    const bar = doc.items[0];
    if (bar.kind !== "bar") throw new Error("bar");
    const styled = { ...doc, items: [{ ...bar, color: "#123456", progress: 40 }] };
    const next = refreshFromGantt(styled, [task({ title: "Hull", dueDate: "2027-02-01", status: "done" })]);
    expect(next.items[0]).toMatchObject({ label: "Hull", end: "2027-02-01", color: "#123456", progress: 100 });
  });
});
