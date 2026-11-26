// One message shape for every channel, so the unified stream can show email and, later, other sources alike.
// Adapters only ever return messages addressed to a project; everything else is dropped.
import { projectSlugsFor } from "./inbound";

export type Source = "email";

// Reserved for later sources: messenger, site. The badge letter is what the stream shows next to a message.
export const SOURCE_BADGE: Record<Source, string> = { email: "E" };

export type StreamMessage = {
  source: Source;
  projectSlug: string;
  externalId: string;
  author: { name: string | null; address: string | null };
  subject: string | null;
  text: string;
  sentAt: string;
};

export type ChannelAdapter<Raw> = {
  source: Source;
  // Project-addressed messages found in one raw delivery. Empty when none are for a project.
  receive: (raw: Raw) => StreamMessage[];
  // False when the channel cannot send; the composer then explains why.
  canReply: boolean;
  reply: (projectSlug: string, text: string, inReplyTo?: string) => Promise<void>;
};

export type RawEmail = {
  recipients: string[];
  messageId: string;
  fromName: string | null;
  fromAddress: string;
  subject: string;
  bodyText: string;
  sentAt: string;
};

export function emailAdapter(
  inboundDomain: string,
  send: (slug: string, text: string, inReplyTo?: string) => Promise<void>,
): ChannelAdapter<RawEmail> {
  return {
    source: "email",
    canReply: true,
    reply: send,
    receive: (raw) =>
      projectSlugsFor(raw.recipients, inboundDomain).map((projectSlug) => ({
        source: "email",
        projectSlug,
        externalId: raw.messageId,
        author: { name: raw.fromName, address: raw.fromAddress || null },
        subject: raw.subject || null,
        text: raw.bodyText,
        sentAt: raw.sentAt,
      })),
  };
}
