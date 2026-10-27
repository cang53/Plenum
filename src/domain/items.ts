// Hand-made items: a project manager creates or edits a task, decision or risk without a message.
import { STATUSES, type TaskStatus } from "./board";

export const MANUAL_KINDS = ["task", "decision", "risk"] as const;
export type ManualKind = (typeof MANUAL_KINDS)[number];

export const TABLE: Record<ManualKind, string> = { task: "tasks", decision: "decisions", risk: "risks" };
export const PRIORITIES = ["low", "normal", "high"] as const;
export const RISK_STATUSES = ["open", "closed"] as const;
export const RISK_KINDS = ["risk", "issue"] as const;

export type ItemInput = {
  kind: ManualKind;
  title: string;
  details: string;
  status: string;
  riskKind: string;
  priority: string;
  startDate: string | null;
  dueDate: string | null;
  costCode: string;
  site: string;
  isMilestone: boolean;
  ownerId: string | null;
  phaseId: string | null;
  parentId: string | null;
  predecessorIds: string[];
  sourceMessageId?: string | null;
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
    riskKind: text(form, "riskKind") || "risk",
    priority: text(form, "priority") || "normal",
    startDate: text(form, "startDate") || null,
    dueDate: text(form, "dueDate") || null,
    costCode: text(form, "costCode"),
    site: text(form, "site"),
    isMilestone: form.get("isMilestone") === "on",
    ownerId: text(form, "ownerId") || null,
    phaseId: text(form, "phaseId") || null,
    parentId: text(form, "parentId") || null,
    predecessorIds: [...new Set(form.getAll("predecessorIds").map(String).filter(Boolean))],
    sourceMessageId: text(form, "sourceMessageId") || null,
  };
  if (item.sourceMessageId && !/^[0-9a-f-]{36}$/i.test(item.sourceMessageId)) throw new Error("unknown source message");
  if (!item.title) throw new Error("title is required");
  if (item.startDate && item.dueDate && item.dueDate < item.startDate) throw new Error("due date is before start date");
  if (kind === "task" && !STATUSES.includes(item.status as TaskStatus)) item.status = "todo";
  if (kind === "task" && !PRIORITIES.includes(item.priority as (typeof PRIORITIES)[number])) throw new Error("unknown priority");
  if (kind === "risk" && !RISK_STATUSES.includes(item.status as (typeof RISK_STATUSES)[number])) item.status = "open";
  if (kind === "risk" && !RISK_KINDS.includes(item.riskKind as (typeof RISK_KINDS)[number])) throw new Error("unknown risk kind");
  for (const d of [item.startDate, item.dueDate]) if (d && !/^\d{4}-\d{2}-\d{2}$/.test(d)) throw new Error("invalid date");
  if (item.site.length > 80) throw new Error("site is too long");
  if (item.startDate && item.dueDate && item.startDate > item.dueDate) throw new Error("start is after due date");
  return item;
}

// The columns to write for this kind. Decisions have no status.
export function toColumns(item: ItemInput): Record<string, string | boolean | null> {
  const base = { title: item.title };
  if (item.kind === "task") return { ...base, details: item.details, status: item.status, priority: item.priority, start_date: item.startDate, due_date: item.dueDate, cost_code: item.costCode || null, site: item.site, is_milestone: item.isMilestone, owner_id: item.ownerId, phase_id: item.phaseId, parent_id: item.parentId };
  if (item.kind === "risk") return { ...base, details: item.details, status: item.status, kind: item.riskKind, due_date: item.dueDate, owner_id: item.ownerId };
  return { ...base, details: item.details };
}
