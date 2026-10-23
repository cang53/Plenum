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
