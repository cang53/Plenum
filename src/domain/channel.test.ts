import { describe, expect, it } from "vitest";
import { emailAdapter, mockTeamsAdapter, SOURCE_BADGE, type ChannelAdapter, type StreamMessage } from "./channel";

const email = {
  recipients: ["line4-ghent@in.plenum.example", "someone@other.org"],
  messageId: "<a@x>",
  fromName: "Ana",
  fromAddress: "ana@x.org",
  subject: "Valve",
  bodyText: "Hello",
  sentAt: "2026-10-22T10:00:00Z",
};
const teams = { channelId: "c1", id: "m1", from: { displayName: "Ben" }, text: "Hi", createdDateTime: "2026-10-22T11:00:00Z" };

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

  it("mock Teams adapter ignores channels that are not projects", () => {
    const { adapter } = mockTeamsAdapter({ c1: "line4-ghent" });
    expect(adapter.receive({ ...teams, channelId: "other" })).toEqual([]);
    expect(adapter.receive(teams)[0]).toMatchObject({ source: "teams", projectSlug: "line4-ghent", author: { name: "Ben", address: null }, subject: null });
  });

  it("both adapters meet one contract and give the stream a badge", async () => {
    const { adapter: t, sent } = mockTeamsAdapter({ c1: "p-one" });
    const e = emailAdapter("in.plenum.example", async () => {});
    const messages: StreamMessage[] = [...e.receive(email), ...t.receive(teams)];
    for (const m of messages) expect(SOURCE_BADGE[m.source]).toBeTruthy();
    expect(messages.map((m) => m.source)).toEqual(["email", "teams"]);
    const adapters: ChannelAdapter<never>[] = [e, t] as ChannelAdapter<never>[];
    expect(adapters.every((a) => a.canReply)).toBe(true);
    await t.reply("p-one", "done", "m1");
    expect(sent).toEqual([{ projectSlug: "p-one", text: "done", inReplyTo: "m1" }]);
  });
});
