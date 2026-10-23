import { describe, expect, it, vi } from "vitest";
import { draftReply } from "./replyDraft";
import type { TranslateIo } from "./translate";
import { ruleBasedAsk } from "./triage-fake";

const io = (over: Partial<TranslateIo> = {}): TranslateIo => ({
  load: async () => ({ projectId: "p1", subject: "Hi", body: "Please book it." }),
  takeCall: async () => true,
  ...over,
});
const ask = vi.fn().mockResolvedValue('{"text":"Dank u, ik boek het."}');

describe("draftReply", () => {
  it("returns the translation", async () => {
    expect(await draftReply("m1", io(), ask)).toBe("Dank u, ik boek het.");
  });
  it("shows the original (null) with the rules fallback, without loading anything", async () => {
    const load = vi.fn();
    expect(await draftReply("m1", io({ load }), ruleBasedAsk)).toBeNull();
    expect(load).not.toHaveBeenCalled();
  });
  it("returns null when the message is not visible or the daily cap is used", async () => {
    expect(await draftReply("m1", io({ load: async () => null }), ask)).toBeNull();
    const fresh = vi.fn();
    expect(await draftReply("m1", io({ takeCall: async () => false }), fresh)).toBeNull();
    expect(fresh).not.toHaveBeenCalled();
  });
  it("returns null when the model fails or answers badly", async () => {
    expect(await draftReply("m1", io(), vi.fn().mockRejectedValue(new Error("down")))).toBeNull();
    expect(await draftReply("m1", io(), vi.fn().mockResolvedValue("{}"))).toBeNull();
  });
});
