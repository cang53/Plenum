// Asks Amazon Bedrock (EU region) for a triage suggestion. The client is injectable for tests.

import { BedrockRuntimeClient, ConverseCommand } from "@aws-sdk/client-bedrock-runtime";
import type { TimelineMessage } from "@/domain/timeline";
import { buildUserPrompt, parseSuggestion, SYSTEM_PROMPT, type Suggestion } from "@/domain/triage";

export type Ask = (system: string, user: string) => Promise<string>;

export const BEDROCK_TIMEOUT_MS = 15_000;
export const BEDROCK_ATTEMPTS = 3;

type Sender = Pick<BedrockRuntimeClient, "send">;
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// An answer is usable only when it holds a JSON object. Anything else counts as a failure.
function checkAnswer(answer: string): string {
  try {
    const data: unknown = JSON.parse(answer.slice(answer.indexOf("{"), answer.lastIndexOf("}") + 1));
    if (typeof data === "object" && data !== null) return answer;
  } catch {
    // falls through
  }
  throw new Error("Bedrock returned a malformed answer");
}

// BEDROCK_MODEL_ID must be an EU inference profile or model, so message text stays in the EU.
// Each call has a timeout and a few attempts with a growing pause; the last error is thrown.
export function bedrockAsk(env: Record<string, string | undefined> = process.env, client?: Sender, pauseMs = 500): Ask {
  const modelId = env.BEDROCK_MODEL_ID;
  if (!modelId) throw new Error("BEDROCK_MODEL_ID is not set");
  const region = env.BEDROCK_REGION ?? env.AWS_REGION ?? "eu-west-1";
  if (!region.startsWith("eu-")) throw new Error(`Bedrock region ${region} is outside the EU`);
  if (/^(us|us-gov|apac|ap|global)\./.test(modelId)) throw new Error(`Bedrock model ${modelId} is not an EU model or profile`);
  const sender = client ?? new BedrockRuntimeClient({ region });
  return async (system, user) => {
    let failure: unknown;
    for (let attempt = 1; attempt <= BEDROCK_ATTEMPTS; attempt++) {
      try {
        const out = await sender.send(
          new ConverseCommand({
            modelId,
            system: [{ text: system }],
            messages: [{ role: "user", content: [{ text: user }] }],
            inferenceConfig: { maxTokens: 400, temperature: 0 },
          }),
          { abortSignal: AbortSignal.timeout(BEDROCK_TIMEOUT_MS) },
        );
        return checkAnswer(out.output?.message?.content?.map((part) => part.text ?? "").join("") ?? "");
      } catch (error) {
        failure = error;
        if (attempt < BEDROCK_ATTEMPTS) await wait(pauseMs * attempt);
      }
    }
    throw failure;
  };
}

export async function suggestFor(message: TimelineMessage, ask: Ask): Promise<Suggestion | null> {
  return parseSuggestion(await ask(SYSTEM_PROMPT, buildUserPrompt(message)));
}
