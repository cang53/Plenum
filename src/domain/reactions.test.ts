import { describe, expect, it } from "vitest";
import { groupReactions, reactionFor } from "./reactions";
import { AGENT_ADDRESS, isToAgent, proposalHosts, waitingForAgent } from "./agent";

describe("reactionFor", () => {
  it("picks one emoji from plain words", () => {
    expect(reactionFor("Thanks for the update")).toBe("👍");
    expect(reactionFor("Concrete delivery is blocked by rain")).toBe("👀");
    expect(reactionFor("Inspection finished and approved")).toBe("✅");
    expect(reactionFor("Well done team")).toBe("🎉");
  });
  it("stays quiet on questions and ordinary chat", () => {
    expect(reactionFor("Is the slab done?")).toBeNull();
    expect(reactionFor("See you at nine")).toBeNull();
  });
});

describe("groupReactions", () => {
  it("counts per emoji and marks mine and CobIA's", () => {
    const g = groupReactions([
      { message_id: "m", emoji: "👍", user_id: "me", agent: false },
      { message_id: "m", emoji: "👍", user_id: "bob", agent: false },
      { message_id: "m", emoji: "👀", user_id: null, agent: true },
    ], "me").get("m")!;
    expect(g).toEqual([{ emoji: "👍", count: 2, mine: true, agent: false }, { emoji: "👀", count: 1, mine: false, agent: true }]);
  });
});

describe("replying to CobIA", () => {
  const all = [
    { id: "r", fromAddress: AGENT_ADDRESS, bodyText: "Hello", replyTo: null, receivedAt: "2026-01-01T10:00:00Z" },
    { id: "a", fromAddress: "me@x.com", bodyText: "ok, and the slab?", replyTo: "r", receivedAt: "2026-01-01T10:00:30Z" },
    { id: "b", fromAddress: "bob@x.com", bodyText: "unrelated", replyTo: null, receivedAt: "2026-01-01T10:00:31Z" },
  ];
  it("counts as tagging", () => {
    expect(isToAgent(all[1], all)).toBe(true);
    expect(isToAgent(all[2], all)).toBe(false);
    expect(isToAgent(all[0], all)).toBe(false);
    expect([...waitingForAgent(all, new Date("2026-01-01T10:01:00Z"))]).toEqual(["a"]);
    expect(proposalHosts(all).get("a")).toBe("a");
  });
});
