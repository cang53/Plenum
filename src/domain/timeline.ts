// Timeline logic: a project's messages newest first, grouped by day, with search.

export const DOC_TYPES = ["drawing", "specification", "permit", "report", "other"] as const;
export type DocType = (typeof DOC_TYPES)[number];

// docType, docRef (document or drawing number) and revision are set by a manager; superseded: a later message has the same number.
export type TimelineAttachment = {
  id: string; filename: string; contentType: string; sizeBytes: number;
  docType?: DocType | null; docRef?: string | null; revision?: string | null; superseded?: boolean;
};

export type TimelineMessage = {
  id: string;
  source: "email";
  fromName: string | null;
  fromAddress: string;
  subject: string;
  bodyText: string;
  receivedAt: string;
  attachments: TimelineAttachment[];
};

// A row of public.messages with its message_attachments, as Supabase returns it.
export type MessageRow = {
  id: string;
  source: "email";
  from_name: string | null;
  from_address: string;
  subject: string;
  body_text: string;
  received_at: string;
  message_attachments: {
    id: string; part_index: number; filename: string; content_type: string; size_bytes: number;
    doc_type?: DocType | null; doc_ref?: string | null; revision?: string | null; superseded?: boolean | null;
  }[];
};

export function fromRow(row: MessageRow): TimelineMessage {
  return {
    id: row.id,
    source: row.source,
    fromName: row.from_name,
    fromAddress: row.from_address,
    subject: row.subject,
    bodyText: row.body_text,
    receivedAt: row.received_at,
    attachments: [...row.message_attachments]
      .sort((a, b) => a.part_index - b.part_index)
      .map((a) => ({
        id: a.id, filename: a.filename, contentType: a.content_type, sizeBytes: a.size_bytes,
        docType: a.doc_type ?? null, docRef: a.doc_ref ?? null, revision: a.revision ?? null, superseded: a.superseded ?? false,
      })),
  };
}

export type TimelineSearch = { query?: string; on?: string };

export type TimelineDay = { day: string; messages: TimelineMessage[] };

// Lower case without accents, so "Peeters" finds "peeters" and "reunion" finds "réunion".
export function normalize(text: string): string {
  return text.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}

// The calendar day (YYYY-MM-DD) of a moment in the project's time zone.
export function dayKey(iso: string, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" })
    .formatToParts(new Date(iso));
  const part = (type: string) => parts.find((p) => p.type === type)?.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}

// Every word of the query must appear in the sender, subject, body or an attachment name.
export function matches(message: TimelineMessage, search: TimelineSearch, timeZone: string): boolean {
  if (search.on && dayKey(message.receivedAt, timeZone) !== search.on) return false;
  const words = normalize(search.query ?? "").split(/\s+/).filter(Boolean);
  if (words.length === 0) return true;
  const haystack = normalize(
    [message.fromName ?? "", message.fromAddress, message.subject, message.bodyText, ...message.attachments.flatMap((a) => [a.filename, a.docType ?? "", a.docRef ?? "", a.revision ?? ""])].join(
      "\n",
    ),
  );
  return words.every((word) => haystack.includes(word));
}

export function buildTimeline(messages: TimelineMessage[], search: TimelineSearch, timeZone: string): TimelineDay[] {
  const days: TimelineDay[] = [];
  const sorted = messages
    .filter((m) => matches(m, search, timeZone))
    .sort((a, b) => Date.parse(b.receivedAt) - Date.parse(a.receivedAt) || a.id.localeCompare(b.id));
  for (const message of sorted) {
    const day = dayKey(message.receivedAt, timeZone);
    const last = days[days.length - 1];
    if (last?.day === day) last.messages.push(message);
    else days.push({ day, messages: [message] });
  }
  return days;
}

// "Today", "Yesterday" or the date, relative to now in the project's time zone.
export function relativeDay(day: string, nowIso: string, timeZone: string): "today" | "yesterday" | null {
  const today = dayKey(nowIso, timeZone);
  if (day === today) return "today";
  const yesterday = new Date(Date.parse(`${today}T12:00:00Z`) - 86_400_000).toISOString().slice(0, 10);
  return day === yesterday ? "yesterday" : null;
}

// File size in the reader's language, e.g. "240 kB" or "1.4 MB".
export function formatSize(bytes: number, locale: string): string {
  const mb = bytes >= 1_000_000;
  return new Intl.NumberFormat(locale, {
    style: "unit",
    unit: mb ? "megabyte" : "kilobyte",
    maximumFractionDigits: mb ? 1 : 0,
  }).format(mb ? bytes / 1_000_000 : Math.max(1, Math.round(bytes / 1000)));
}
