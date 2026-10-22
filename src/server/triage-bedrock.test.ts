import { describe, expect, it, vi } from "vitest";
import { bedrockAsk } from "./triage";

const env = { BEDROCK_MODEL_ID: "eu.anthropic.claude-x", BEDROCK_REGION: "eu-west-1" };
const reply = (text: string) => ({ output: { message: { content: [{ text }] } } });
const client = (send: ReturnType<typeof vi.fn>) => ({ send }) as never;

describe("bedrockAsk", () => {
  it("refuses non-EU regions and models", () => {
    expect(() => bedrockAsk({ ...env, BEDROCK_REGION: "us-east-1" })).toThrow("outside the EU");
    expect(() => bedrockAsk({ ...env, BEDROCK_MODEL_ID: "us.anthropic.claude-x" })).toThrow("not an EU");
  });

  it("retries a failing call, with a timeout signal, then succeeds", async () => {
    const send = vi.fn().mockRejectedValueOnce(new Error("throttled")).mockResolvedValue(reply('{"kind":"none"}'));
    expect(await bedrockAsk(env, client(send), 0)("s", "u")).toBe('{"kind":"none"}');
    expect(send).toHaveBeenCalledTimes(2);
    expect(send.mock.calls[0][1].abortSignal).toBeInstanceOf(AbortSignal);
  });

  it("gives up after bounded attempts and rejects malformed answers", async () => {
    const down = vi.fn().mockRejectedValue(new Error("down"));
    await expect(bedrockAsk(env, client(down), 0)("s", "u")).rejects.toThrow("down");
    expect(down).toHaveBeenCalledTimes(3);
    const junk = vi.fn().mockResolvedValue(reply("sorry, no"));
    await expect(bedrockAsk(env, client(junk), 0)("s", "u")).rejects.toThrow("malformed");
  });
});
