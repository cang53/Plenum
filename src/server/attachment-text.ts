// Reads text from PDF, DOCX and plain-text attachments so triage can see it. Size-capped; anything
// unreadable is skipped. The text is only passed to triage, never stored or shown.
import { getDocumentProxy, extractText } from "unpdf";
import mammoth from "mammoth";

export const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024;
export const MAX_TEXT_PER_ATTACHMENT = 4000;
const MAX_ATTACHMENTS = 5;

export type RawAttachment = { filename: string; contentType: string; content: Buffer };

const DOCX = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

async function readText(a: RawAttachment): Promise<string> {
  const type = a.contentType.toLowerCase();
  if (type === "application/pdf") {
    const { text } = await extractText(await getDocumentProxy(new Uint8Array(a.content)), { mergePages: true });
    return text;
  }
  if (type === DOCX) return (await mammoth.extractRawText({ buffer: a.content })).value;
  if (type === "text/plain") return a.content.toString("utf8");
  return "";
}

// keepLines keeps the line breaks (a meeting note is read line by line); limit is the most text read from each file.
export async function attachmentText(attachments: RawAttachment[], opts: { limit?: number; keepLines?: boolean } = {}): Promise<string> {
  const parts: string[] = [];
  for (const a of attachments.filter((x) => x.content.length <= MAX_ATTACHMENT_BYTES).slice(0, MAX_ATTACHMENTS)) {
    const text = await readText(a).catch(() => "");
    const clean = (opts.keepLines ? text.replace(/[ \t]+/g, " ").replace(/\s*\n\s*/g, "\n") : text.replace(/\s+/g, " ")).trim().slice(0, opts.limit ?? MAX_TEXT_PER_ATTACHMENT);
    if (clean) parts.push(`[Attachment ${a.filename}]\n${clean}`);
  }
  return parts.join("\n\n");
}
