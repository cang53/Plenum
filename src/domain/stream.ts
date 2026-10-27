// Stream logic: project messages in reading order (oldest day first, oldest message first inside a day, newest at the bottom), consecutive messages from one sender grouped.
import type { StoredSuggestion } from "./triage";
import { dayKey, relativeDay, type TimelineMessage } from "./timeline";

export type StreamGroup = { sender: string; messages: TimelineMessage[] };
export type StreamDay = { day: string; relative: "today" | "yesterday" | null; groups: StreamGroup[] };

export function buildStream(messages: TimelineMessage[], now: string, timeZone: string): StreamDay[] {
  const sorted = [...messages].sort((a, b) => Date.parse(b.receivedAt) - Date.parse(a.receivedAt) || a.id.localeCompare(b.id));
  const byDay = new Map<string, TimelineMessage[]>();
  for (const m of sorted) {
    const key = dayKey(m.receivedAt, timeZone);
    byDay.set(key, [...(byDay.get(key) ?? []), m]);
  }
  return [...byDay].reverse().map(([day, list]) => {
    const groups: StreamGroup[] = [];
    for (const m of list.reverse()) {
      const sender = m.fromAddress.toLowerCase();
      const last = groups[groups.length - 1];
      if (last?.sender === sender) last.messages.push(m);
      else groups.push({ sender, messages: [m] });
    }
    return { day, relative: relativeDay(day, now, timeZone), groups };
  });
}

// The oldest message that arrived after the person last read the stream, and how many arrived. Null on a first visit or when nothing is new.
export function newSince(messages: TimelineMessage[], lastRead: string | undefined): { id: string; count: number } | null {
  const since = Date.parse(lastRead ?? "");
  if (Number.isNaN(since)) return null;
  const fresh = messages.filter((m) => Date.parse(m.receivedAt) > since).sort((a, b) => Date.parse(a.receivedAt) - Date.parse(b.receivedAt) || a.id.localeCompare(b.id));
  return fresh.length ? { id: fresh[0].id, count: fresh.length } : null;
}

// Pending AI suggestions keyed by the message they came from, so each card sits under its source.
export function suggestionsByMessage(list: StoredSuggestion[]): Map<string, StoredSuggestion[]> {
  const by = new Map<string, StoredSuggestion[]>();
  for (const s of list) if (s.status === "pending") by.set(s.messageId, [...(by.get(s.messageId) ?? []), s]);
  return by;
}

// ---- Conversations: messages on one subject form a thread, whichever platform they came from. ----
export type StreamSource = TimelineMessage["source"];
export type Thread = { key: string; subject: string; messages: TimelineMessage[]; last: TimelineMessage; sources: StreamSource[]; unread: number; needsReply: boolean };
export type StreamQuery = { thread?: string; q?: string; filter?: "unread" | "reply"; source?: StreamSource | "teams" };

// "Re: Fwd: Gearbox" and "gearbox" are the same subject.
export const threadKey = (subject: string): string => subject.replace(/^(\s*(re|fw|fwd|aw|antw|doorst)\s*:)+/i, "").trim().toLowerCase();

export function buildThreads(messages: TimelineMessage[], readAt?: string): Thread[] {
  const since = Date.parse(readAt ?? "");
  const by = new Map<string, TimelineMessage[]>();
  for (const m of messages) by.set(threadKey(m.subject), [...(by.get(threadKey(m.subject)) ?? []), m]);
  return [...by].map(([key, list]) => {
    const sorted = list.sort((a, b) => Date.parse(a.receivedAt) - Date.parse(b.receivedAt) || a.id.localeCompare(b.id));
    const last = sorted[sorted.length - 1];
    return {
      key, last, messages: sorted,
      subject: sorted[0].subject.replace(/^(\s*(re|fw|fwd|aw|antw|doorst)\s*:)+/i, "").trim(),
      sources: [...new Set(sorted.map((m) => m.source))],
      unread: Number.isNaN(since) ? 0 : sorted.filter((m) => Date.parse(m.receivedAt) > since).length,
      needsReply: last.source !== "app",
    };
  }).sort((a, b) => Date.parse(b.last.receivedAt) - Date.parse(a.last.receivedAt) || a.key.localeCompare(b.key));
}

// What the page shows for a query: the filtered conversation list, the open conversation (the newest if none is chosen) and its days.
export function streamModel(messages: TimelineMessage[], query: StreamQuery, readAt: string | undefined, now: string, timeZone: string) {
  const needle = query.q?.trim().toLowerCase();
  const threads = buildThreads(messages, readAt).filter((t) =>
    (!query.source || (t.sources as string[]).includes(query.source)) &&
    (query.filter !== "unread" || t.unread > 0) &&
    (query.filter !== "reply" || t.needsReply) &&
    (!needle || t.messages.some((m) => `${m.subject} ${m.fromName ?? ""} ${m.fromAddress} ${m.bodyText}`.toLowerCase().includes(needle))));
  const current = threads.find((t) => t.key === query.thread) ?? threads[0] ?? null;
  return { threads, current, days: current ? buildStream(current.messages, now, timeZone) : [] };
}
