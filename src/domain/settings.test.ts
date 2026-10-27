import { describe, expect, it } from "vitest";
import { checkName, checkSlug, slugFrom, checkTeamsLink } from "./settings";

describe("checkName", () => {
  it("trims and accepts a name", () => expect(checkName("  Line 4 ")).toEqual({ ok: true, value: "Line 4" }));
  it("rejects a blank name", () => expect(checkName("  ").ok).toBe(false));
});

describe("checkSlug", () => {
  it("lowercases and trims", () => expect(checkSlug(" Line4-Ghent ")).toEqual({ ok: true, value: "line4-ghent" }));
  it.each(["a", "-start", "has space", "under_score", "x".repeat(64)])("rejects %s", (s) =>
    expect(checkSlug(s).ok).toBe(false));
});

describe("slugFrom", () => {
  it("makes a valid slug", () => expect(checkSlug(slugFrom("Line 4 – Ghent!", "ab12")).ok).toBe(true));
  it("falls back when the name has no letters", () => expect(slugFrom("???", "ab12")).toBe("project-ab12"));
});

describe("checkTeamsLink", () => {
  const link = "https://teams.cloud.microsoft/l/channel/19%3A9febd999b5694e839b28dfc5b44dd811%40thread.tacv2/Line%204?groupId=d89f9576-d43e-447b-817a-babe3f58b79d&tenantId=2df60cd0";
  it("reads the team and channel ids from a channel link", () => {
    expect(checkTeamsLink(link)).toEqual({ ok: true, value: { teamId: "d89f9576-d43e-447b-817a-babe3f58b79d", channelId: "19:9febd999b5694e839b28dfc5b44dd811@thread.tacv2" } });
  });
  it("clears on empty and refuses anything else", () => {
    expect(checkTeamsLink("  ")).toEqual({ ok: true, value: null });
    expect(checkTeamsLink("https://example.com/l/channel/x?groupId=y")).toEqual({ ok: false, error: "settings.teamsInvalid" });
    expect(checkTeamsLink("not a link")).toEqual({ ok: false, error: "settings.teamsInvalid" });
  });
});
