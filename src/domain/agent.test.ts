import { describe, expect, it } from "vitest";
import { AGENT_ADDRESS, proposalHosts, waitingForAgent } from "./agent";

const msg = (id: string, fromAddress: string, bodyText: string) => ({ id, fromAddress, bodyText });

describe("proposalHosts", () => {
  it("puts proposals under the agent's reply once it exists", () => {
    const h = proposalHosts([msg("a", "me@x.com", "@agent plan"), msg("b", "bob@x.com", "hello"), msg("r", AGENT_ADDRESS, "ok")]);
    expect(h.get("a")).toBe("r");
    expect(h.get("b")).toBe("b");
  });
  it("keeps them under the tagged message until the reply arrives", () => {
    expect(proposalHosts([msg("a", "me@x.com", "@agent plan")]).get("a")).toBe("a");
  });
});

describe("waitingForAgent", () => {
  const now = new Date("2026-01-01T10:01:00Z");
  const m = (id: string, from: string, body: string, at: string) => ({ ...msg(id, from, body), receivedAt: at });
  it("flags a recent tagged message with no reply", () => {
    expect([...waitingForAgent([m("a", "me@x.com", "@agent hi", "2026-01-01T10:00:30Z")], now)]).toEqual(["a"]);
  });
  it("clears once the agent replied or the wait is over", () => {
    expect(waitingForAgent([m("a", "me@x.com", "@agent hi", "2026-01-01T10:00:30Z"), m("r", AGENT_ADDRESS, "ok", "2026-01-01T10:00:40Z")], now).size).toBe(0);
    expect(waitingForAgent([m("a", "me@x.com", "@agent hi", "2026-01-01T09:00:00Z")], now).size).toBe(0);
  });
});
