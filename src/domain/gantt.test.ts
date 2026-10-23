import { describe, expect, it } from "vitest";
import { buildBars, criticalPath, shiftDates, slipDays } from "./gantt";

const task = (id: string, startDate: string | null, dueDate: string | null) => ({ id, title: id, startDate, dueDate, phase: null });

describe("buildBars", () => {
  it("places bars on a day grid from the earliest start and skips undated tasks", () => {
    const { bars, totalDays } = buildBars([task("b", "2026-11-05", "2026-11-06"), task("a", "2026-11-01", "2026-11-03"), task("c", null, null)]);
    expect(bars.map((b) => [b.id, b.startDay, b.length])).toEqual([["a", 0, 3], ["b", 4, 2]]);
    expect(totalDays).toBe(6);
  });
  it("is empty without dated tasks", () => {
    expect(buildBars([task("a", null, "2026-11-03")]).bars).toEqual([]);
  });
});

describe("shiftDates", () => {
  it("moves both dates and crosses month ends", () => {
    expect(shiftDates(task("a", "2026-11-29", "2026-12-02"), 2)).toEqual({ startDate: "2026-12-01", dueDate: "2026-12-04" });
  });
  it("refuses an undated task", () => {
    expect(() => shiftDates(task("a", null, null), 1)).toThrow();
  });
});

describe("criticalPath", () => {
  const tasks = [task("a", "2026-11-01", "2026-11-03"), task("b", "2026-11-04", "2026-11-10"), task("c", "2026-11-04", "2026-11-05"), task("d", "2026-11-11", "2026-11-12")];
  const deps = [{ predecessorId: "a", successorId: "b" }, { predecessorId: "a", successorId: "c" }, { predecessorId: "b", successorId: "d" }, { predecessorId: "c", successorId: "d" }];
  it("follows the longest chain", () => {
    expect([...criticalPath(tasks, deps)].sort()).toEqual(["a", "b", "d"]);
  });
  it("is empty when nothing depends on anything", () => {
    expect(criticalPath(tasks, []).size).toBe(0);
  });
  it("survives a loop", () => {
    expect(() => criticalPath(tasks, [...deps, { predecessorId: "d", successorId: "a" }])).not.toThrow();
  });
});

describe("slipDays", () => {
  it("counts days the due date moved and skips tasks without a baseline or a date", () => {
    const base = { a: { startDate: "2026-11-01", dueDate: "2026-11-05" }, c: { startDate: "2026-11-01", dueDate: "2026-11-05" } };
    const slip = slipDays([task("a", "2026-11-02", "2026-11-08"), task("b", "2026-11-01", "2026-11-02"), task("c", null, null)], base);
    expect([...slip]).toEqual([["a", 3]]);
  });
});
