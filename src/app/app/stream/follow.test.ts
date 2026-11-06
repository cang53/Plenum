import { describe, expect, it } from "vitest";
import { countNew, diffIds, isNearEnd } from "./follow";

describe("follow", () => {
  it("knows when the reader is near the bottom", () => {
    expect(isNearEnd(2000, 1100, 800)).toBe(true);
    expect(isNearEnd(2000, 500, 800)).toBe(false);
    expect(isNearEnd(2000, 1000, 800, 240)).toBe(true);
  });
  it("counts only additions", () => {
    expect(countNew(3, 5)).toBe(2);
    expect(countNew(5, 3)).toBe(0);
  });
  it("tells older messages from newer ones", () => {
    expect(diffIds(["b", "c"], ["a", "b", "c", "d"])).toEqual({ prepended: ["a"], appended: ["d"] });
    expect(diffIds(["b"], ["b"])).toEqual({ prepended: [], appended: [] });
    expect(diffIds([], ["a", "b"])).toEqual({ prepended: [], appended: ["a", "b"] });
  });
});
