export type InboxTab = "needs" | "mentions" | "history";

export function inboxTab(value: string | undefined): InboxTab {
  return value === "mentions" || value === "history" ? value : "needs";
}

// A snoozed suggestion stays out of the list until its time has passed.
export function awake<T extends { id: string }>(list: T[], snoozedUntil: Map<string, string>, now: string): T[] {
  return list.filter((s) => (snoozedUntil.get(s.id) ?? "") <= now);
}

// A, D and H act on the open item; J and K are handled by the shared list keys.
export function inboxAction(key: string): "apply" | "dismiss" | "snooze" | null {
  return ({ a: "apply", d: "dismiss", h: "snooze" } as const)[key.toLowerCase() as "a"] ?? null;
}

// Suggestions from one message sit together, in the order the first of each message appears.
export function groupByMessage<T extends { messageId: string }>(list: T[]): { messageId: string; items: T[] }[] {
  const groups = new Map<string, T[]>();
  for (const i of list) groups.set(i.messageId, [...(groups.get(i.messageId) ?? []), i]);
  return [...groups].map(([messageId, items]) => ({ messageId, items }));
}

export type BatchItem = { id: string; kind: "task" | "decision" | "risk" | "change_request"; title: string; details: string };

// "Apply all" sends the group's suggestions as JSON; anything that is not a list of complete items is refused.
export function parseBatch(raw: string): BatchItem[] {
  let list: unknown;
  try { list = JSON.parse(raw); } catch { return []; }
  if (!Array.isArray(list)) return [];
  const ok = (i: any): i is BatchItem => !!i && typeof i.id === "string" && typeof i.title === "string" && typeof i.details === "string" && ["task", "decision", "risk", "change_request"].includes(i.kind); // eslint-disable-line @typescript-eslint/no-explicit-any
  return list.every(ok) ? list : [];
}
