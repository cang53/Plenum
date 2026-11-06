import { describe, expect, it } from "vitest";
import { calendarCells, monthOf, shiftMonth } from "./calendar";

describe("calendar", () => {
  it("falls back to the current month for a missing or bad value", () => {
    expect(monthOf(undefined, "2026-11-06")).toBe("2026-11");
    expect(monthOf("2026-13", "2026-11-06")).toBe("2026-11");
    expect(monthOf("2027-02", "2026-11-06")).toBe("2027-02");
  });
  it("moves across year ends", () => {
    expect(shiftMonth("2026-12", 1)).toBe("2027-01");
    expect(shiftMonth("2026-01", -1)).toBe("2025-12");
  });
  it("starts on Monday, pads to full weeks and marks days", () => {
    const cells = calendarCells("2026-11", "2026-11-06", ["2026-11-18"], ["2026-11-11"]);
    expect(cells.length % 7).toBe(0);
    expect(cells.slice(0, 6).every((c) => c.n === null)).toBe(true); // 1 Nov 2026 is a Sunday
    expect(cells[6].n).toBe(1);
    expect(cells.find((c) => c.n === 6)?.today).toBe(true);
    expect(cells.find((c) => c.n === 18)?.milestone).toBe(true);
    expect(cells.find((c) => c.n === 11)?.task).toBe(true);
  });
});
