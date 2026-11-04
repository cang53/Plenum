import { describe, expect, it } from "vitest";
import { liveChannelSpec } from "./live";

describe("liveChannelSpec", () => {
  it("listens to messages and AI cards of one project only", () => {
    const s = liveChannelSpec("p1");
    expect(s.name).toBe("stream-p1");
    expect(s.filters.map((f) => [f.table, (f as { filter?: string }).filter])).toEqual([["messages", "project_id=eq.p1"], ["agent_actions", "project_id=eq.p1"], ["message_attachments", undefined]]);
  });
});
