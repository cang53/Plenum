import { describe, expect, it, vi } from "vitest";
import { translateMessage, type TranslateIo } from "./translate";
import { ruleBasedAsk } from "./triage-fake";

const io = (over: Partial<TranslateIo> = {}): TranslateIo => ({
  load: async () => ({ projectId: "p1", subject: "Hi", body: "Please book it." }),
  takeCall: async () => true,
  ...over,
});
const ask = vi.fn().mockResolvedValue('{"text":"Boek het alstublieft."}');

describe("translateMessage", () => {
  it("returns the translation", async () => {
    expect(await translateMessage("m1", "nl", io(), ask)).toBe("Boek het alstublieft.");
    expect(ask.mock.calls[0][1]).toContain("Dutch");
  });
  it("shows the original (null) with the rules fallback, without loading anything", async () => {
    const load = vi.fn();
    expect(await translateMessage("m1", "nl", io({ load }), ruleBasedAsk)).toBeNull();
    expect(load).not.toHaveBeenCalled();
  });
  it("returns null when the message is not visible or the daily cap is used", async () => {
    expect(await translateMessage("m1", "nl", io({ load: async () => null }), ask)).toBeNull();
    const fresh = vi.fn();
    expect(await translateMessage("m1", "nl", io({ takeCall: async () => false }), fresh)).toBeNull();
    expect(fresh).not.toHaveBeenCalled();
  });
  it("returns null when the model fails or answers badly", async () => {
    expect(await translateMessage("m1", "nl", io(), vi.fn().mockRejectedValue(new Error("down")))).toBeNull();
    expect(await translateMessage("m1", "nl", io(), vi.fn().mockResolvedValue("{}"))).toBeNull();
  });
});
