import { describe, expect, it } from "vitest";
import { isAgentTagged } from "@/domain/agent";

describe("agent tag the indicator follows", () => {
  it("matches @agent and @plenum, not other words", () => {
    expect(isAgentTagged("hi @agent please")).toBe(true);
    expect(isAgentTagged("mail me@agentless.com")).toBe(false);
  });
});
