// Hand-made items: a project manager creates or edits a task, decision or risk without a message.
import { STATUSES, type TaskStatus } from "./board";

export const MANUAL_KINDS = ["task", "decision", "risk"] as const;
export type ManualKind = (typeof MANUAL_KINDS)[number];

export const TABLE: Record<ManualKind, string> = { task: "tasks", decision: "decisions", risk: "risks" };
export const PRIORITIES = ["low", "normal", "high"] as const;
export const RISK_STATUSES = ["open", "closed"] as const;

export type ItemInput = {
  kind: ManualKind;
  title: string;
  details: string;
  status: string;
  priority: string;
  dueDate: string | null;
};

const text = (form: FormData, key: string) => String(form.get(key) ?? "").trim();

export function itemFromForm(form: FormData): ItemInput {
  const kind = text(form, "kind") as ManualKind;
  if (!MANUAL_KINDS.includes(kind)) throw new Error("unknown kind");
  const item = {
    kind,
    title: text(form, "title"),
    details: text(form, "details"),
    status: text(form, "status"),
    priority: text(form, "priority") || "normal",
    dueDate: text(form, "dueDate") || null,
  };
  if (!item.title) throw new Error("title is required");
  if (kind === "task" && !STATUSES.includes(item.status as TaskStatus)) item.status = "todo";
  if (kind === "task" && !PRIORITIES.includes(item.priority as (typeof PRIORITIES)[number])) throw new Error("unknown priority");
  if (kind === "risk" && !RISK_STATUSES.includes(item.status as (typeof RISK_STATUSES)[number])) item.status = "open";
  if (item.dueDate && !/^\d{4}-\d{2}-\d{2}$/.test(item.dueDate)) throw new Error("invalid date");
  return item;
}

// The columns to write for this kind. Decisions have no status.
export function toColumns(item: ItemInput): Record<string, string | null> {
  const base = { title: item.title };
  if (item.kind === "task") return { ...base, details: item.details, status: item.status, priority: item.priority, due_date: item.dueDate };
  if (item.kind === "risk") return { ...base, details: item.details, status: item.status };
  return { ...base, details: item.details };
}
