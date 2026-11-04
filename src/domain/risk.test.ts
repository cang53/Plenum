import { describe, expect, it } from "vitest";
import { clampLevel, matrixCells, riskBand, riskScore } from "./risk";

describe("risk scoring", () => {
  it("multiplies likelihood by severity, and uses impact alone for issues", () => {
    expect(riskScore(4, 5)).toBe(20);
    expect(riskScore(1, 4, "issue")).toBe(20);
  });
  it("bands scores", () => {
    expect([riskBand(4), riskBand(8), riskBand(14), riskBand(15)]).toEqual(["low", "medium", "medium", "high"]);
  });
  it("keeps levels between 1 and 5", () => {
    expect([clampLevel("9"), clampLevel(0), clampLevel("x"), clampLevel(2.4)]).toEqual([5, 1, 3, 2]);
  });
  it("puts issues in the top row of their impact column", () => {
    const cells = matrixCells([
      { id: "a", kind: "risk" as const, likelihood: 2, severity: 3 },
      { id: "b", kind: "issue" as const, likelihood: 1, severity: 3 },
    ]);
    expect(cells.get("2:3")?.map((i) => i.id)).toEqual(["a"]);
    expect(cells.get("5:3")?.map((i) => i.id)).toEqual(["b"]);
  });
});
