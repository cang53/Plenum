import { describe, expect, it } from "vitest";
import { checkName, checkSlug } from "./settings";

describe("checkName", () => {
  it("trims and accepts a name", () => expect(checkName("  Line 4 ")).toEqual({ ok: true, value: "Line 4" }));
  it("rejects a blank name", () => expect(checkName("  ").ok).toBe(false));
});

describe("checkSlug", () => {
  it("lowercases and trims", () => expect(checkSlug(" Line4-Ghent ")).toEqual({ ok: true, value: "line4-ghent" }));
  it.each(["a", "-start", "has space", "under_score", "x".repeat(64)])("rejects %s", (s) =>
    expect(checkSlug(s).ok).toBe(false));
});
