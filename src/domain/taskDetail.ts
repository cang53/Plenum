import type { MessageKey } from "@/lib/messages";

export type ChecklistItem = { id: string; text: string; done: boolean };

export const checklistProgress = (items: ChecklistItem[]) => ({ done: items.filter((i) => i.done).length, total: items.length });

const ACTIONS: Record<string, MessageKey> = {
  created: "taskDetail.act.created",
  status_changed: "taskDetail.act.status",
  dates_changed: "taskDetail.act.dates",
  owner_changed: "taskDetail.act.owner",
  details_changed: "taskDetail.act.details",
  phase_changed: "taskDetail.act.phase",
  parent_changed: "taskDetail.act.parent",
  site_changed: "taskDetail.act.site",
};

// Audit actions the screen has words for; anything else reads as a plain change.
export const activityKey = (action: string): MessageKey => ACTIONS[action] ?? "taskDetail.act.other";

// Only a task's own text is checked here; the database enforces the same limit.
export function checklistText(raw: FormDataEntryValue | null): string {
  const text = String(raw ?? "").trim();
  if (!text || text.length > 300) throw new Error("checklist item must be 1 to 300 characters");
  return text;
}
