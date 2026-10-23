import { describe, expect, it } from "vitest";
import { checkDecision, weekStart } from "./timesheet";

describe("weekStart", () => {
  it("returns the Monday", () => {
    expect(weekStart("2026-10-23")).toBe("2026-10-19");
    expect(weekStart("2026-10-25")).toBe("2026-10-19");
    expect(weekStart("2026-10-19")).toBe("2026-10-19");
  });
});

describe("checkDecision", () => {
  const form = (o: Record<string, string>) => new Map(Object.entries(o));
  it("accepts a decision on a week start and trims the note", () => {
    expect(checkDecision(form({ week: "2026-10-19", user: "u1", decision: "sent_back", note: " Add Friday " }))).toEqual({ week: "2026-10-19", user: "u1", decision: "sent_back", note: "Add Friday" });
  });
  it("rejects other days and other decisions", () => {
    expect(checkDecision(form({ week: "2026-10-20", user: "u1", decision: "approved" }))).toBeNull();
    expect(checkDecision(form({ week: "2026-10-19", user: "u1", decision: "submitted" }))).toBeNull();
  });
});
