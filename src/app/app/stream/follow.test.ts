import { describe, expect, it } from "vitest";
import { countNew, isNearEnd } from "./follow";

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
});
