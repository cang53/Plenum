import { describe, expect, it, vi } from "vitest";
import { bedrockAsk, suggestFor } from "./triage";

const message = {
  id: "m1", source: "email" as const, fromName: "Marta", fromAddress: "m@s.example", subject: "Gearbox delivery date",
  bodyText: "Delivery slips to 28 Nov.", receivedAt: "2026-10-22T09:00:00Z", attachments: [],
};

describe("suggestFor", () => {
  it("sends the message to the model and parses the answer", async () => {
    const ask = vi.fn().mockResolvedValue('{"kind":"risk","title":"Gearbox late","details":"28 Nov."}');
    expect(await suggestFor(message, ask)).toEqual({ kind: "risk", title: "Gearbox late", details: "28 Nov." });
    expect(ask.mock.calls[0][1]).toContain("Subject: Gearbox delivery date");
  });

  it("gives no suggestion when the answer is unusable", async () => {
    expect(await suggestFor(message, async () => "sorry")).toBeNull();
  });
});

describe("bedrockAsk", () => {
  it("needs a model id", () => {
    expect(() => bedrockAsk({})).toThrow("BEDROCK_MODEL_ID");
  });
});
