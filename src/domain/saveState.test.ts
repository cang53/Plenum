import { describe, expect, it } from "vitest";
import { itemVersion, SAVED_PARAM } from "./saveState";

describe("saveState", () => {
  it("fingerprints title, details and status, and treats a missing status as empty", () => {
    expect(itemVersion({ title: "a", details: "b", status: "todo" })).not.toBe(itemVersion({ title: "a", details: "b", status: "done" }));
    expect(itemVersion({ title: "a", details: "b" })).toBe(itemVersion({ title: "a", details: "b", status: null }));
  });
  it("only accepts kind:uuid for the saved toast", () => {
    expect(SAVED_PARAM.test("risk:0f8fad5b-d9cb-469f-a165-70867728950e")).toBe(true);
    expect(SAVED_PARAM.test("risk:<script>")).toBe(false);
  });
});
