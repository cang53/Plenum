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

// One chat for the project: email, Plenum and Teams messages in time order. A source and a search narrow it.
export type StreamQuery = { q?: string; source?: TimelineMessage["source"] };

export function filterFeed(messages: TimelineMessage[], query: StreamQuery): TimelineMessage[] {
  const needle = query.q?.trim().toLowerCase();
  return messages.filter((m) =>
    (!query.source || m.source === query.source) &&
    (!needle || `${m.subject} ${m.fromName ?? ""} ${m.fromAddress} ${m.bodyText}`.toLowerCase().includes(needle)));
}
