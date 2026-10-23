// Draft a reply to one stored message. Returns null (the box stays empty) when the rules fallback is
// active, the daily cap is used up, the message is not visible, or the model fails. Nothing is sent or stored.
import { logError } from "@/lib/log";
import { buildReplyDraftPrompt, parseReplyDraft, REPLY_DRAFT_SYSTEM_PROMPT } from "@/domain/replyDraft";
import type { TranslateIo } from "./translate";
import type { Ask } from "./triage";
import { ruleBasedAsk } from "./triage-fake";

export async function draftReply(messageId: string, io: TranslateIo, ask: Ask): Promise<string | null> {
  if (ask === ruleBasedAsk) return null;
  const found = await io.load(messageId);
  if (!found || !(await io.takeCall(found.projectId))) return null;
  try {
    return parseReplyDraft(await ask(REPLY_DRAFT_SYSTEM_PROMPT, buildReplyDraftPrompt(found.subject, found.body)));
  } catch (error) {
    logError("Bedrock reply draft failed", error);
    return null;
  }
}
