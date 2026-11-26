import type { PanelMessage } from "@/app/app/stream/ThreadPanel";

export type ThreadRow = { id: string; fromName: string | null; fromAddress: string; bodyText: string; replyTo: string | null; receivedAt: string };

const name = (r: ThreadRow) => r.fromName || r.fromAddress || "?";
const initial = (r: ThreadRow) => name(r).charAt(0).toUpperCase();

// The first message and the replies of a thread as the panel shows them. A reply that answers another message of the thread carries a short quote of it.
export function panelMessages(rows: ThreadRow[], rootId: string, time: (iso: string) => string): { root: PanelMessage | null; replies: PanelMessage[] } {
  const byId = new Map(rows.map((r) => [r.id, r]));
  const make = (r: ThreadRow): PanelMessage => {
    const to = r.replyTo && r.replyTo !== rootId ? byId.get(r.replyTo) : undefined;
    return {
      id: r.id, who: name(r), initial: initial(r), time: time(r.receivedAt),
      lines: r.bodyText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean),
      ...(to ? { quote: { who: name(to), initial: initial(to), text: to.bodyText.replace(/\s+/g, " ").trim().slice(0, 80) } } : {}),
    };
  };
  const ordered = [...rows].sort((a, b) => a.receivedAt.localeCompare(b.receivedAt) || a.id.localeCompare(b.id));
  const root = byId.get(rootId);
  return { root: root ? make(root) : null, replies: ordered.filter((r) => r.id !== rootId).map(make) };
}

// "Ann, Ben" for two people, "Ann, Ben and 4 others" for more; the template has {names} and {n}.
export function participantsLine(people: string[], template: string): string {
  const names = [...new Set(people)];
  if (names.length <= 2) return names.join(", ");
  return template.replace("{names}", names.slice(0, 2).join(", ")).replace("{n}", String(names.length - 2));
}
