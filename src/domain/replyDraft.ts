// Prompt and answer parsing for a suggested reply. The draft only fills the reply box; the person edits and sends it.
export const REPLY_DRAFT_SYSTEM_PROMPT =
  'Write a short, polite reply to the email, in the same language as the email. Do not invent facts, dates or promises; keep it open where unsure. Answer with only JSON: {"text":"<reply>"}.';

export function buildReplyDraftPrompt(subject: string, body: string): string {
  return `${subject}\n\n${body}`;
}

// Returns the draft text, or null when the answer is not usable.
export function parseReplyDraft(answer: string): string | null {
  try {
    const data: unknown = JSON.parse(answer.slice(answer.indexOf("{"), answer.lastIndexOf("}") + 1));
    const text = typeof data === "object" && data !== null ? (data as { text?: unknown }).text : null;
    return typeof text === "string" && text.trim() ? text.trim() : null;
  } catch {
    return null;
  }
}
