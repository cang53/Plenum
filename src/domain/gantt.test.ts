import { describe, expect, it } from "vitest";
import { buildBars, criticalPath, dayOf, layoutRows, scaleTicks, shiftDates, slipDays } from "./gantt";

const task = (id: string, startDate: string | null, dueDate: string | null) => ({ id, title: id, startDate, dueDate, phase: null });

describe("milestones", () => {
  it("sit one day wide on the due date", () => {
    const { bars } = buildBars([{ ...task("a", "2026-11-01", "2026-11-03"), isMilestone: false }, { ...task("m", "2026-11-01", "2026-11-10"), isMilestone: true }]);
    const m = bars.find((b) => b.id === "m")!;
    expect(m).toMatchObject({ startDay: 9, length: 1, isMilestone: true });
  });
});

describe("buildBars", () => {
  it("places bars on a day grid from the earliest start and skips undated tasks", () => {
    const { bars, totalDays } = buildBars([task("b", "2026-11-05", "2026-11-06"), task("a", "2026-11-01", "2026-11-03"), task("c", null, null)]);
    expect(bars.map((b) => [b.id, b.startDay, b.length])).toEqual([["a", 0, 3], ["b", 4, 2]]);
    expect(totalDays).toBe(6 + 21);
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

describe("layoutRows", () => {
  const bar = (id: string, phaseId: string | null, startDay: number, length: number) => ({ id, title: id, phase: phaseId, phaseId, startDay, length, start: "", due: "", isMilestone: false });
  const g = (id: string, parentId: string | null = null, afterTaskId: string | null = null) => ({ id, name: id, parentId, afterTaskId });
  const show = (rows: ReturnType<typeof layoutRows>) => rows.map((r) => `${r.depth}${r.group ? "G" : "T"}:${r.group?.id ?? r.bar!.id}`);
  it("nests groups, spans a group over everything inside it and puts ungrouped tasks last", () => {
    const rows = layoutRows([bar("a", "Build", 0, 3), bar("b", null, 1, 1), bar("c", "Fix", 5, 2)], [g("Build"), g("Fix", "Build")], new Set());
    expect(show(rows)).toEqual(["0G:Build", "1T:a", "1G:Fix", "2T:c", "0T:b"]);
    expect(rows[0]).toMatchObject({ startDay: 0, endDay: 6, count: 2 });
  });
  it("places a nested group right below its anchor task and skips what a folded group holds", () => {
    const bars = [bar("a", "P", 0, 1), bar("z", "P", 4, 1), bar("r", "Rem", 2, 1)];
    expect(show(layoutRows(bars, [g("P"), g("Rem", "P", "a")], new Set()))).toEqual(["0G:P", "1T:a", "1G:Rem", "2T:r", "1T:z"]);
    expect(show(layoutRows(bars, [g("P"), g("Rem", "P", "a")], new Set(["P"])))).toEqual(["0G:P"]);
  });
  it("keeps groups with no tasks unless asked to hide them, and survives a parent loop", () => {
    expect(show(layoutRows([], [g("E")], new Set()))).toEqual(["0G:E"]);
    expect(layoutRows([], [g("E")], new Set(), { hideEmpty: true })).toEqual([]);
    expect(layoutRows([bar("a", "X", 0, 1)], [g("X", "Y"), g("Y", "X")], new Set()).length).toBeGreaterThan(0);
  });
  it("gives name-only tasks a top-level group", () => {
    expect(show(layoutRows([{ ...bar("a", null, 0, 1), phase: "Proposed" }], [], new Set()))).toEqual(["0G:name:Proposed", "1T:a"]);
  });
});

describe("scaleTicks", () => {
  it("labels Mondays, month starts and quarter starts", () => {
    const first = dayOf("2026-09-28"); // a Monday
    expect(scaleTicks(first, 22, "week").map((t) => t.iso)).toEqual(["2026-09-28", "2026-10-05", "2026-10-12", "2026-10-19"]);
    expect(scaleTicks(first, 100, "month").map((t) => t.iso)).toEqual(["2026-10-01", "2026-11-01", "2026-12-01", "2027-01-01"]);
    expect(scaleTicks(first, 100, "quarter").map((t) => t.iso)).toEqual(["2026-10-01", "2027-01-01"]);
  });
});
