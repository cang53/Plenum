import { describe, expect, it } from "vitest";
import { formatReport, score } from "./accuracy";
import { TEST_SET, toMessage } from "./testset";

describe("test set", () => {
  it("has 50 cases, ten per kind including none", () => {
    expect(TEST_SET).toHaveLength(50);
    const counts = new Map<string, number>();
    for (const c of TEST_SET) counts.set(c.expected, (counts.get(c.expected) ?? 0) + 1);
    expect([...counts.keys()].sort()).toEqual(["change_request", "decision", "none", "risk", "task"]);
    expect([...counts.values()]).toEqual([10, 10, 10, 10, 10]);
  });

  it("has no duplicate messages", () => {
    expect(new Set(TEST_SET.map((c) => c.body)).size).toBe(50);
    expect(toMessage(TEST_SET[0], 0).subject).toBe(TEST_SET[0].subject);
  });
});

describe("score", () => {
  it("counts matching kinds and treats null as none", () => {
    const report = score(["task", "none", "risk"], [{ kind: "task", title: "t", details: "", reason: "r" }, null, { kind: "task", title: "t", details: "", reason: "r" }]);
    expect(report.correct).toBe(2);
    expect(report.byKind.risk).toEqual({ correct: 0, total: 1 });
    expect(formatReport(report)).toContain("2/3 (67%)");
  });
});
