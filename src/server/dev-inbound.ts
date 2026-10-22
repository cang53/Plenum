import { randomUUID } from "node:crypto";
import type { StoredEmail } from "./inbound-email";

// Local stand-in for SES: turns a pasted message into the same StoredEmail the webhook stores.
export type PastedMessage = { slug?: unknown; from?: unknown; subject?: unknown; body?: unknown };

export async function handlePastedMessage(
  input: PastedMessage,
  storeEmail: (email: StoredEmail) => Promise<string | null>,
): Promise<{ status: number; body: { id?: string; error?: string } }> {
  const { slug, from, subject, body } = input;
  if (typeof slug !== "string" || typeof from !== "string" || !slug.trim() || !from.trim()) {
    return { status: 400, body: { error: "slug and from are required" } };
  }
  const id = await storeEmail({
    emailSlug: slug.trim(),
    externalId: `<dev-${randomUUID()}@plenum.local>`,
    fromName: null,
    fromAddress: from.trim(),
    to: [],
    cc: [],
    subject: typeof subject === "string" ? subject : "",
    bodyText: typeof body === "string" ? body : "",
    sentAt: new Date().toISOString(),
    rawLocation: "dev://pasted",
    attachments: [],
  });
  return id ? { status: 201, body: { id } } : { status: 404, body: { error: "no open project at that address" } };
}
