import { describe, expect, it } from "vitest";
import { parseRetention } from "./retention";

describe("parseRetention", () => {
  it("treats empty as keep forever", () => expect(parseRetention("  ")).toEqual({ ok: true, days: null }));
  it("accepts 30 days or more", () => expect(parseRetention("90")).toEqual({ ok: true, days: 90 }));
  it.each(["29", "1.5", "abc", "-30", "99999"])("rejects %s", (v) => expect(parseRetention(v)).toEqual({ ok: false }));
});
