// The "@" picker in the Stream composer: what can be mentioned, and which entries match what was typed.
export type MentionType = "person" | "agent" | "task" | "risk" | "issue" | "decision" | "file";
export type MentionItem = { id: string; type: MentionType; label: string; href: string };

const ORDER: MentionType[] = ["person", "agent", "task", "risk", "issue", "decision", "file"];

// People and CobIA first, then project items; within a group, names that start with the query come before names that only contain it.
export function filterMentions(items: MentionItem[], query: string, limit = 8): MentionItem[] {
  const q = query.trim().toLowerCase();
  const rank = (i: MentionItem) => (!q || i.label.toLowerCase().startsWith(q) ? 0 : 1);
  return items
    .filter((i) => !q || i.label.toLowerCase().includes(q))
    .sort((a, b) => rank(a) - rank(b) || ORDER.indexOf(a.type) - ORDER.indexOf(b.type) || a.label.localeCompare(b.label))
    .slice(0, limit);
}
