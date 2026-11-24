import { describe, expect, it } from "vitest";
import { emailAdapter, SOURCE_BADGE } from "./channel";

const email = {
  recipients: ["line4-ghent@in.plenum.example", "someone@other.org"],
  messageId: "<a@x>",
  fromName: "Ana",
  fromAddress: "ana@x.org",
  subject: "Valve",
  bodyText: "Hello",
  sentAt: "2026-10-22T10:00:00Z",
};

describe("channel adapters", () => {
  it("email adapter reads only project-addressed mail", async () => {
    const calls: unknown[][] = [];
    const adapter = emailAdapter("in.plenum.example", async (...args) => void calls.push(args));
    expect(adapter.receive(email)).toEqual([
      { source: "email", projectSlug: "line4-ghent", externalId: "<a@x>", author: { name: "Ana", address: "ana@x.org" }, subject: "Valve", text: "Hello", sentAt: email.sentAt },
    ]);
    expect(adapter.receive({ ...email, recipients: ["a@other.org"] })).toEqual([]);
    await adapter.reply("line4-ghent", "ok", "<a@x>");
    expect(calls).toEqual([["line4-ghent", "ok", "<a@x>"]]);
  });

  it("gives the stream a badge", () => {
    const e = emailAdapter("in.plenum.example", async () => {});
    for (const m of e.receive(email)) expect(SOURCE_BADGE[m.source]).toBeTruthy();
    expect(e.canReply).toBe(true);
  });
});
