import { describe, expect, it } from "vitest";
import { isEarlyWarning, knowledgeCount, projectRewardsOn, rewardsOn, streakWeeks, switchList } from "./rewards";



describe("rewardsOn", () => {
  it("is on with no switches", () => expect(rewardsOn([], "North")).toBe(true));
  it("is off for a listed site only", () => {
    expect(rewardsOn(["North"], "North")).toBe(false);
    expect(rewardsOn(["North"], "South")).toBe(true);
  });
  it("is off everywhere for the empty site", () => expect(rewardsOn([""], "South")).toBe(false));
});

describe("switchList", () => {
  it("trims, drops blanks and duplicates", () => expect(switchList(false, " North\n\nNorth\nSouth ")).toEqual(["North", "South"]));
  it("adds the everywhere switch", () => expect(switchList(true, "")).toEqual([""]));
  it("drops names over 80 characters", () => expect(switchList(false, "x".repeat(81))).toEqual([]));
});

describe("projectRewardsOn", () => {
  it("is on with no switches or no sites", () => {
    expect(projectRewardsOn([], ["North"])).toBe(true);
    expect(projectRewardsOn(["North"], [])).toBe(true);
  });
  it("is off when every site is off, or everywhere", () => {
    expect(projectRewardsOn(["North"], ["North", " North "])).toBe(false);
    expect(projectRewardsOn(["North"], ["North", "South"])).toBe(true);
    expect(projectRewardsOn([""], ["South"])).toBe(false);
  });
});

describe("streakWeeks", () => {
  const today = "2026-10-23"; // a Friday
  it("counts the full lookback with no overdue tasks", () => expect(streakWeeks([], today)).toBe(104));
  it("does not count weeks before the first task existed", () => {
    expect(streakWeeks([{ dueDate: null, status: "todo", updatedAt: "2026-10-21T00:00:00Z", createdAt: "2026-10-14T00:00:00Z" }], today)).toBe(2);
  });
  it("stops at the week an untouched task went overdue", () => {
    // due Wed 2026-10-07, last touched long before: overdue in weeks starting Oct 5 onward -> broken this week
    expect(streakWeeks([{ dueDate: "2026-10-07", status: "doing", updatedAt: "2026-09-01T00:00:00Z" }], today)).toBe(0);
  });
  it("counts weeks before the task went overdue", () => {
    const t = [{ dueDate: "2026-10-07", status: "doing", updatedAt: "2026-10-20T09:00:00Z" }];
    // overdue from the week of Oct 5; updated in the week of Oct 19 only, so Oct 5 and Oct 12 are broken
    expect(streakWeeks(t, today)).toBe(1);
  });
  it("ignores a task done before the week ended", () => {
    const t = [{ dueDate: "2026-10-07", status: "done", updatedAt: "2026-10-08T09:00:00Z" }];
    expect(streakWeeks(t, today)).toBe(104);
  });
});

describe("knowledgeCount", () => {
  it("counts only decisions that are written up and linked to a message", () => {
    expect(knowledgeCount([
      { details: "Why we chose X", sourceMessageId: "m1" },
      { details: "  ", sourceMessageId: "m2" },
      { details: "No source", sourceMessageId: null },
    ])).toBe(1);
  });
  it("is zero for no decisions", () => expect(knowledgeCount([])).toBe(0));
});

describe("isEarlyWarning", () => {
  it("needs 14 days between raised and due", () => {
    expect(isEarlyWarning("2026-10-01T09:00:00Z", "2026-10-15")).toBe(true);
    expect(isEarlyWarning("2026-10-01T09:00:00Z", "2026-10-14")).toBe(false);
  });
  it("is false without a due date", () => expect(isEarlyWarning("2026-10-01T09:00:00Z", null)).toBe(false));
});
