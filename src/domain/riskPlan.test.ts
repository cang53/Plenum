import { describe, expect, it } from "vitest";
import { fallbackPlan, parsePlan, placeOwners } from "./riskPlan";

describe("parsePlan", () => {
  it("keeps valid steps, fills a missing date from the other, drops bad ones", () => {
    const out = parsePlan('{"steps":[{"title":"Call","due_date":"2026-11-10","reason":"r"},{"title":"","due_date":"2026-11-10"},{"title":"Bad","start_date":"2026-11-12","due_date":"2026-11-10"}]}');
    expect(out).toEqual([{ title: "Call", startDate: "2026-11-10", dueDate: "2026-11-10", reason: "r" }]);
  });
  it("returns null for junk", () => {
    expect(parsePlan("sorry")).toBeNull();
    expect(parsePlan('{"steps":[]}')).toBeNull();
  });
});

describe("placeOwners", () => {
  const step = { title: "t", startDate: "2026-11-10", dueDate: "2026-11-12", reason: "" };
  const people = [{ userId: "a", name: "Ann", role: "member" }, { userId: "b", name: "Bob", role: "member" }, { userId: "c", name: "Cy", role: "contributor" }];
  it("picks the least busy member and never a contributor", () => {
    const busy = [{ ownerId: "a", startDate: "2026-11-09", dueDate: "2026-11-11" }];
    expect(placeOwners([step], people, busy)[0].ownerId).toBe("b");
  });
  it("reports a gap when everyone is full", () => {
    const full = Array.from({ length: 4 }, () => ["a", "b"].map((ownerId) => ({ ownerId, startDate: "2026-11-10", dueDate: "2026-11-12" }))).flat();
    const [p] = placeOwners([step], people, full);
    expect(p.ownerId).toBeNull();
    expect(p.gapNote).toMatch(/booked/);
  });
  it("reports a gap when only contributors exist", () => {
    expect(placeOwners([step], [people[2]], [])[0].gapNote).toMatch(/Nobody/);
  });
  it("spreads steps over people", () => {
    const two = placeOwners([step, step], people, []);
    expect(new Set(two.map((p) => p.ownerId)).size).toBe(2);
  });
});

describe("fallbackPlan", () => {
  it("gives dated steps from today", () => {
    expect(fallbackPlan("X", "2026-11-04")[0].startDate).toBe("2026-11-04");
  });
});

import { isoWeek, ownerLoad, weekGrid } from "./riskPlan";
describe("plan screen helpers", () => {
  it("computes ISO weeks", () => {
    expect([isoWeek("2026-11-04"), isoWeek("2026-01-01"), isoWeek("2026-12-31")]).toEqual([45, 1, 53]);
  });
  it("reports load as a share of the full threshold", () => {
    const busy = [{ ownerId: "a", startDate: "2026-11-10", dueDate: "2026-11-12" }];
    expect(ownerLoad({ startDate: "2026-11-10", dueDate: "2026-11-11" }, "a", busy)).toBe(25);
    expect(ownerLoad({ startDate: "2026-11-10", dueDate: "2026-11-11" }, "b", busy)).toBe(0);
  });
  it("lays steps and tasks on week columns", () => {
    const g = weekGrid([{ title: "s", startDate: "2026-11-05", dueDate: "2026-11-18" }], [{ title: "t", startDate: "2026-11-01", dueDate: "2026-11-12" }, { title: "far", startDate: "2027-06-01", dueDate: "2027-06-05" }]);
    expect(g.weeks[0]).toBe("W45");
    expect(g.steps[0]).toEqual({ title: "s", from: 0, to: 2 });
    expect(g.tasks.map((t) => t.title)).toEqual(["t"]);
  });
});
