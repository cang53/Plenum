// Asks Amazon Bedrock (EU region) for a triage suggestion. The client is injectable for tests.

import { BedrockRuntimeClient, ConverseCommand } from "@aws-sdk/client-bedrock-runtime";
import type { TimelineMessage } from "@/domain/timeline";
import { buildUserPrompt, parseSuggestion, SYSTEM_PROMPT, type Suggestion } from "@/domain/triage";

export type Ask = (system: string, user: string) => Promise<string>;

// BEDROCK_MODEL_ID must be an EU inference profile or model, so message text stays in the EU.
export function bedrockAsk(env: Record<string, string | undefined> = process.env): Ask {
  const modelId = env.BEDROCK_MODEL_ID;
  if (!modelId) throw new Error("BEDROCK_MODEL_ID is not set");
  const client = new BedrockRuntimeClient({ region: env.BEDROCK_REGION ?? env.AWS_REGION ?? "eu-west-1" });
  return async (system, user) => {
    const out = await client.send(
      new ConverseCommand({
        modelId,
        system: [{ text: system }],
        messages: [{ role: "user", content: [{ text: user }] }],
        inferenceConfig: { maxTokens: 400, temperature: 0 },
      }),
    );
    return out.output?.message?.content?.map((part) => part.text ?? "").join("") ?? "";
  };
}

export async function suggestFor(message: TimelineMessage, ask: Ask): Promise<Suggestion | null> {
  return parseSuggestion(await ask(SYSTEM_PROMPT, buildUserPrompt(message)));
}
