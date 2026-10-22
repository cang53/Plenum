import { simpleParser, type AddressObject } from "mailparser";
import { attachmentText } from "./attachment-text";
import { projectSlugsFor, rawEmailLocation } from "../domain/inbound";

// The parts of an SES "Received" notification this handler reads.
export type SesNotification = {
  notificationType: string;
  mail: { messageId: string; timestamp: string };
  receipt: {
    recipients: string[];
    virusVerdict?: { status: string };
    action: { type?: string; bucketName?: string; objectKey?: string };
  };
};

export type StoredEmail = {
  emailSlug: string;
  externalId: string;
  fromName: string | null;
  fromAddress: string;
  to: string[];
  cc: string[];
  subject: string;
  bodyText: string;
  sentAt: string | null;
  rawLocation: string;
  attachments: { partIndex: number; filename: string; contentType: string; sizeBytes: number }[];
};

export type InboundDeps = {
  inboundDomain: string;
  loadRawEmail: (bucket: string, key: string) => Promise<Buffer>;
  // Returns the stored message id, or null when no open project has that address.
  storeEmail: (email: StoredEmail) => Promise<string | null>;
};

// attachmentText is read from the email for triage only; it is not stored.
export type InboundResult = { stored: string[]; skipped: string | null; attachmentText?: string };

function addresses(field: AddressObject | AddressObject[] | undefined): string[] {
  const list = Array.isArray(field) ? field : field ? [field] : [];
  return list.flatMap((group) => group.value.map((entry) => entry.address ?? "")).filter(Boolean);
}

export async function handleSesNotification(notification: SesNotification, deps: InboundDeps): Promise<InboundResult> {
  if (notification.notificationType !== "Received") return { stored: [], skipped: "not a received email" };
  if (notification.receipt.virusVerdict?.status === "FAIL") return { stored: [], skipped: "virus found" };

  const slugs = projectSlugsFor(notification.receipt.recipients, deps.inboundDomain);
  if (slugs.length === 0) return { stored: [], skipped: "no project address" };

  const raw = rawEmailLocation(notification.receipt.action);
  if (!raw) return { stored: [], skipped: "raw email not in S3" };

  const parsed = await simpleParser(await deps.loadRawEmail(raw.bucket, raw.key));
  const sender = parsed.from?.value[0];
  const email: Omit<StoredEmail, "emailSlug"> = {
    externalId: parsed.messageId ?? `<${notification.mail.messageId}@ses>`,
    fromName: sender?.name || null,
    fromAddress: sender?.address ?? "",
    to: addresses(parsed.to),
    cc: addresses(parsed.cc),
    subject: parsed.subject ?? "",
    bodyText: parsed.text ?? "",
    sentAt: (parsed.date ?? new Date(notification.mail.timestamp)).toISOString(),
    rawLocation: `s3://${raw.bucket}/${raw.key}`,
    attachments: parsed.attachments.map((attachment, partIndex) => ({
      partIndex,
      filename: attachment.filename ?? `attachment-${partIndex + 1}`,
      contentType: attachment.contentType,
      sizeBytes: attachment.size,
    })),
  };

  // One email CC'd to two projects is stored once in each.
  const stored: string[] = [];
  for (const emailSlug of slugs) {
    const id = await deps.storeEmail({ ...email, emailSlug });
    if (id) stored.push(id);
  }
  const text = stored.length
    ? await attachmentText(parsed.attachments.map((a) => ({ filename: a.filename ?? "attachment", contentType: a.contentType, content: a.content }))).catch(() => "")
    : "";
  return { stored, skipped: stored.length ? null : "no open project at that address", attachmentText: text };
}
