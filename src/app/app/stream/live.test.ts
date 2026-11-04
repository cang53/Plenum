import { describe, expect, it } from "vitest";
import { liveChannelSpec } from "./live";

describe("liveChannelSpec", () => {
  it("listens to messages and AI cards of one project only", () => {
    const s = liveChannelSpec("p1");
    expect(s.name).toBe("stream-p1");
    expect(s.filters.map((f) => [f.table, "filter" in f ? f.filter : undefined])).toEqual([["messages", "project_id=eq.p1"], ["agent_actions", "project_id=eq.p1"], ["message_attachments", undefined]]);
  });
});
