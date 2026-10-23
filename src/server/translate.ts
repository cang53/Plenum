// Translate one stored message for display. Returns null (the reader keeps the original) when the
// rules fallback is active, the daily cap is used up, the message is not visible, or the model fails.
import { logError } from "@/lib/log";
import { buildTranslatePrompt, parseTranslation, TRANSLATE_SYSTEM_PROMPT } from "@/domain/translate";
import type { Ask } from "./triage";
import { ruleBasedAsk } from "./triage-fake";

export type TranslateIo = {
  // Subject and body, read as the signed-in person so row-level security applies.
  load: (messageId: string) => Promise<{ projectId: string; subject: string; body: string } | null>;
  takeCall: (projectId: string) => Promise<boolean>;
};

export async function translateMessage(messageId: string, language: string, io: TranslateIo, ask: Ask): Promise<string | null> {
  if (ask === ruleBasedAsk) return null;
  const found = await io.load(messageId);
  if (!found || !(await io.takeCall(found.projectId))) return null;
  try {
    return parseTranslation(await ask(TRANSLATE_SYSTEM_PROMPT, buildTranslatePrompt(found.subject, found.body, language)));
  } catch (error) {
    logError("Bedrock translation failed", error);
    return null;
  }
}
