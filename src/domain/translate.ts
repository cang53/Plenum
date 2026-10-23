// Prompt and answer parsing for showing a message in the reader's language. Display only: nothing is stored.
export const TRANSLATE_SYSTEM_PROMPT =
  'Translate the email into the requested language. Keep names, numbers and dates exactly. Answer with only JSON: {"text":"<translation>"}.';

const LANGUAGE_NAMES: Record<string, string> = { en: "English", nl: "Dutch" };

export function buildTranslatePrompt(subject: string, body: string, language: string): string {
  return `Language: ${LANGUAGE_NAMES[language] ?? language}\n\n${subject}\n\n${body}`;
}

// Returns the translated text, or null when the answer is not usable.
export function parseTranslation(answer: string): string | null {
  try {
    const data: unknown = JSON.parse(answer.slice(answer.indexOf("{"), answer.lastIndexOf("}") + 1));
    const text = typeof data === "object" && data !== null ? (data as { text?: unknown }).text : null;
    return typeof text === "string" && text.trim() ? text.trim() : null;
  } catch {
    return null;
  }
}
