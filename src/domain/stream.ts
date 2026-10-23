// Stream logic: project messages newest day first, oldest message first inside a day, consecutive messages from one sender grouped.
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
  return [...byDay].map(([day, list]) => {
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
