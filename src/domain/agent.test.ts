import { describe, expect, it } from "vitest";
import { AGENT_ADDRESS, proposalHosts } from "./agent";

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
