import { describe, expect, it, vi } from "vitest";
import { aiAsk, triageMessage, type TriageIo } from "./triage-run";
import { ruleBasedAsk } from "./triage-fake";

const message = {
  id: "m1", source: "email" as const, fromName: null, fromAddress: "a@b.example", subject: "Crane inspection",
  bodyText: "Please book the inspection.", receivedAt: "2026-10-22T09:00:00Z", attachments: [],
};

function io(found = true): TriageIo & { save: ReturnType<typeof vi.fn> } {
  return { load: async () => (found ? { projectId: "p1", message } : null), save: vi.fn().mockResolvedValue(undefined) };
}

describe("triageMessage", () => {
  it("saves the suggestion for the message's project", async () => {
    const fake = io();
    expect(await triageMessage("m1", fake, ruleBasedAsk)).toBe(true);
    expect(fake.save).toHaveBeenCalledWith({ project_id: "p1", message_id: "m1", kind: "task", title: "Crane inspection", details: "Please book the inspection." });
  });

  it("lets triage read attachment text without storing it on the message", async () => {
    const fake = io();
    const ask = vi.fn().mockResolvedValue('{"kind":"none"}');
    await triageMessage("m1", fake, ask, "[Attachment plan.txt]\nMove the lift to Friday");
    expect(ask.mock.calls[0][1]).toContain("Move the lift to Friday");
    expect(message.bodyText).toBe("Please book the inspection.");
  });

  it("saves nothing when there is no message or nothing to track", async () => {
    const missing = io(false);
    expect(await triageMessage("m1", missing, ruleBasedAsk)).toBe(false);
    const quiet = io();
    expect(await triageMessage("m1", quiet, async () => '{"kind":"none"}')).toBe(false);
    expect(missing.save).not.toHaveBeenCalled();
    expect(quiet.save).not.toHaveBeenCalled();
  });
});

describe("aiAsk", () => {
  it("is the offline fake unless Bedrock is chosen", () => {
    expect(aiAsk({})).toBe(ruleBasedAsk);
    expect(() => aiAsk({ AI_PROVIDER: "bedrock" })).toThrow("BEDROCK_MODEL_ID");
  });
});
