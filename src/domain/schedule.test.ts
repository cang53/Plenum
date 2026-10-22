import { describe, expect, it } from "vitest";
import { findConflicts, wouldCreateLoop, type PlanTask } from "./schedule";

const lifting: PlanTask = { id: "a", title: "Lifting works", startDate: "2026-11-03", dueDate: "2026-11-14" };
const install: PlanTask = { id: "b", title: "Install gearbox", startDate: "2026-11-24", dueDate: "2026-11-28" };
const tests: PlanTask = { id: "c", title: "Electrical tests", startDate: "2026-11-27", dueDate: "2026-12-08" };

describe("findConflicts", () => {
  it("finds a successor that starts before its predecessor is due", () => {
    const conflicts = findConflicts([lifting, install, tests], [
      { predecessorId: "a", successorId: "b" },
      { predecessorId: "b", successorId: "c" },
    ]);
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].successor.title).toBe("Electrical tests");
    expect(conflicts[0].overlapDays).toBe(2);
  });

  it("counts starting on the predecessor's due date as a conflict", () => {
    const sameDay = { ...install, startDate: "2026-11-14" };
    expect(findConflicts([lifting, sameDay], [{ predecessorId: "a", successorId: "b" }])).toHaveLength(1);
  });

  it("ignores tasks without dates", () => {
    const undated = { ...install, startDate: null };
    expect(findConflicts([lifting, undated], [{ predecessorId: "a", successorId: "b" }])).toEqual([]);
  });
});

describe("wouldCreateLoop", () => {
  const chain = [
    { predecessorId: "a", successorId: "b" },
    { predecessorId: "b", successorId: "c" },
  ];

  it("detects a loop through several tasks", () => {
    expect(wouldCreateLoop(chain, "c", "a")).toBe(true);
  });

  it("allows a new dependency that keeps the plan acyclic", () => {
    expect(wouldCreateLoop(chain, "a", "c")).toBe(false);
  });

  it("refuses a task depending on itself", () => {
    expect(wouldCreateLoop(chain, "a", "a")).toBe(true);
  });
});
