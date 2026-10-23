import { describe, expect, it } from "vitest";
import { awake, inboxAction, inboxTab } from "./inbox";

describe("inbox", () => {
  it("falls back to the first tab", () => {
    expect(inboxTab("history")).toBe("history");
    expect(inboxTab("x")).toBe("needs");
    expect(inboxTab(undefined)).toBe("needs");
  });
  it("hides a suggestion only while it is snoozed", () => {
    const snoozed = new Map([["a", "2026-10-24T00:00:00Z"], ["b", "2026-10-22T00:00:00Z"]]);
    const list = [{ id: "a" }, { id: "b" }, { id: "c" }];
    expect(awake(list, snoozed, "2026-10-23T12:00:00Z").map((s) => s.id)).toEqual(["b", "c"]);
  });
  it("maps A, D and H", () => {
    expect([inboxAction("a"), inboxAction("D"), inboxAction("h"), inboxAction("x")]).toEqual(["apply", "dismiss", "snooze", null]);
  });
});
