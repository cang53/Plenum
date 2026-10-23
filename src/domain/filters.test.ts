import { describe, expect, it } from "vitest";
import { dayEnd, filterParams, parseFilters } from "./filters";

describe("filters", () => {
  it("keeps valid values and drops bad ones", () => {
    const f = parseFilters({ from: "2026-10-01", to: "nope", sender: " ann@x.nl ", kind: "risk", task: "abc" });
    expect(f).toEqual({ from: "2026-10-01", to: undefined, sender: "ann@x.nl", kind: "risk", task: undefined });
    expect(parseFilters({ kind: "drop table" }).kind).toBeUndefined();
  });
  it("rejects dates that do not exist", () => {
    expect(parseFilters({ from: "2026-13-45" }).from).toBeUndefined();
  });
  it("lists only the filters that are set", () => {
    expect(filterParams(parseFilters({ sender: "ann", kind: "task" }))).toEqual({ sender: "ann", kind: "task" });
  });
  it("ends a day at the start of the next", () => {
    expect(dayEnd("2026-10-31")).toBe("2026-11-01T00:00:00.000Z");
  });
});
