import { describe, expect, it } from "vitest";
import { checkDecision, checkGrid, shiftWeek, timesheetCsv, weekDays, weekStart } from "./timesheet";

const T = "40000000-0000-0000-0000-000000000001";
const form = (o: Record<string, string>) => new Map(Object.entries(o));

describe("weeks", () => {
  it("starts on Monday", () => {
    expect(weekStart("2026-11-04")).toBe("2026-11-02");
    expect(weekStart("2026-11-08")).toBe("2026-11-02");
    expect(weekStart("2026-11-02")).toBe("2026-11-02");
  });
  it("lists seven days and shifts by weeks", () => {
    expect(weekDays("2026-11-02")).toHaveLength(7);
    expect(weekDays("2026-11-02")[6]).toBe("2026-11-08");
    expect(shiftWeek("2026-11-02", -1)).toBe("2026-10-26");
  });
});

describe("checkGrid", () => {
  it("reads cells, skips blanks and other fields, accepts commas", () => {
    expect(checkGrid(form({ projectId: "x", [`h:${T}:2026-11-02`]: "7,5", [`h:${T}:2026-11-03`]: "", [`h:${T}:2026-11-04`]: "0" }))).toEqual({
      ok: true,
      value: [{ taskId: T, date: "2026-11-02", hours: 7.5 }, { taskId: T, date: "2026-11-04", hours: 0 }],
    });
  });
  it("refuses negative, over 24 and non-numbers", () => {
    for (const v of ["-1", "25", "abc", "1.234"]) expect(checkGrid(form({ [`h:${T}:2026-11-02`]: v })).ok).toBe(false);
  });
});

describe("checkDecision", () => {
  it("accepts a decision on a week start and trims the note", () => {
    expect(checkDecision(form({ week: "2026-10-19", user: "u1", decision: "sent_back", note: " Add Friday " }))).toEqual({ week: "2026-10-19", user: "u1", decision: "sent_back", note: "Add Friday" });
  });
  it("rejects other days and other decisions", () => {
    expect(checkDecision(form({ week: "2026-10-20", user: "u1", decision: "approved" }))).toBeNull();
    expect(checkDecision(form({ week: "2026-10-19", user: "u1", decision: "submitted" }))).toBeNull();
  });
});

describe("timesheetCsv", () => {
  it("writes a header, quotes fields and defuses formulas", () => {
    expect(timesheetCsv([{ person: "=Eve", task: 'Say "hi"', work_date: "2026-10-19", hours: 7.5 }])).toBe(
      '"person","task","date","hours"\r\n"\'=Eve","Say ""hi""","2026-10-19","7.5"\r\n',
    );
  });
});
