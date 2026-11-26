import { describe, expect, it } from "vitest";
import { panelMessages, participantsLine } from "@/domain/threadPanel";

const row = (id: string, name: string, at: string, body: string, replyTo: string | null = null) => ({ id, fromName: name, fromAddress: `${name}@x`, bodyText: body, replyTo, receivedAt: at });
const time = (iso: string) => iso.slice(11, 16);

describe("panelMessages", () => {
  const rows = [row("r2", "Kaiya", "2026-07-10T10:30:00Z", "Sounds like a plan!", "r1"), row("m1", "Brandon", "2026-07-10T10:00:00Z", "Hi, everyone!\n\nLet's talk"), row("r1", "Gretchen", "2026-07-10T10:10:00Z", "Voice note")];
  it("puts the first message apart and the replies in time order", () => {
    const { root, replies } = panelMessages(rows, "m1", time);
    expect(root).toMatchObject({ id: "m1", who: "Brandon", initial: "B", time: "10:00", lines: ["Hi, everyone!", "Let's talk"] });
    expect(replies.map((r) => r.id)).toEqual(["r1", "r2"]);
  });
  it("quotes the reply it answers, but not the first message", () => {
    const { replies } = panelMessages([...rows, row("r3", "Ann", "2026-07-10T11:00:00Z", "Yes", "m1")], "m1", time);
    expect(replies.find((r) => r.id === "r2")?.quote).toEqual({ who: "Gretchen", initial: "G", text: "Voice note" });
    expect(replies.find((r) => r.id === "r3")?.quote).toBeUndefined();
  });
  it("shortens a long quote and has no first message when it is missing", () => {
    const long = row("r1", "Gretchen", "2026-07-10T10:10:00Z", "word ".repeat(40));
    expect(panelMessages([long, row("r2", "K", "2026-07-10T10:20:00Z", "ok", "r1")], "m1", time).replies[1].quote?.text).toHaveLength(80);
    expect(panelMessages([long], "m1", time).root).toBeNull();
  });
  it("falls back to the address when a sender has no name", () => {
    expect(panelMessages([{ ...row("m1", "", "2026-07-10T10:00:00Z", "x"), fromName: null, fromAddress: "zed@x" }], "m1", time).root?.who).toBe("zed@x");
  });
});

describe("participantsLine", () => {
  const tpl = "{names} and {n} others";
  it("lists up to two people and counts the rest", () => {
    expect(participantsLine(["Ann", "Ben", "Ann"], tpl)).toBe("Ann, Ben");
    expect(participantsLine(["Ann", "Ben", "Cy", "Di", "Ed"], tpl)).toBe("Ann, Ben and 3 others");
  });
});
