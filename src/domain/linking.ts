// Manual linking: a person turns a message into a task, decision, risk or change request.
// The new item keeps a link to the message it came from.

import type { TimelineMessage } from "./timeline";

export const ITEM_KINDS = ["task", "decision", "risk", "change_request"] as const;
export type ItemKind = (typeof ITEM_KINDS)[number];

// The database table each kind is stored in.
export const ITEM_TABLE: Record<ItemKind, string> = {
  task: "tasks",
  decision: "decisions",
  risk: "risks",
  change_request: "change_requests",
};

export type ItemDraft = { kind: ItemKind; title: string; details: string };

// A saved item as the timeline shows it under its message.
export type LinkedItem = { id: string; kind: ItemKind; title: string; messageId: string };

const DETAILS_LIMIT = 500;

// A starting point the person can edit: the subject as the title, the start of the body as details.
export function draftFromMessage(kind: ItemKind, message: TimelineMessage): ItemDraft {
  const body = message.bodyText.trim();
  return {
    kind,
    title: message.subject.trim(),
    details: body.length > DETAILS_LIMIT ? `${body.slice(0, DETAILS_LIMIT).trimEnd()}…` : body,
  };
}

export function isValidDraft(draft: ItemDraft): boolean {
  return draft.title.trim().length > 0;
}

// The row to insert into the kind's table. Tasks have no details column.
export function toRow(draft: ItemDraft, projectId: string, messageId: string): Record<string, string> {
  const row = { project_id: projectId, source_message_id: messageId, title: draft.title.trim() };
  return draft.kind === "task" ? row : { ...row, details: draft.details.trim() };
}

export function linkedTo(items: LinkedItem[], messageId: string): LinkedItem[] {
  return items.filter((item) => item.messageId === messageId);
}
