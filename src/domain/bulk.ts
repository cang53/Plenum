// Bulk edits of tasks: one choice applied to many selected tasks.
import { STATUSES } from "./board";

export const BULK_OPS = ["status", "owner", "due"] as const;
export type BulkOp = (typeof BULK_OPS)[number];
export const BULK_MAX = 200;

const COLUMN: Record<BulkOp, string> = { status: "status", owner: "owner_id", due: "due_date" };
const FIELD: Record<BulkOp, string> = { status: "status", owner: "ownerId", due: "dueDate" };

export type BulkEdit = { ids: string[]; patch: Record<string, string | null> };

export function bulkFromForm(form: FormData): BulkEdit {
  const op = String(form.get("op") ?? "") as BulkOp;
  if (!BULK_OPS.includes(op)) throw new Error("unknown bulk action");
  const ids = [...new Set(form.getAll("ids").map(String).filter(Boolean))];
  if (!ids.length) throw new Error("select at least one task");
  if (ids.length > BULK_MAX) throw new Error("too many tasks selected");
  const value = String(form.get(FIELD[op]) ?? "").trim();
  if (op === "status" && !STATUSES.includes(value as (typeof STATUSES)[number])) throw new Error("unknown status");
  if (op === "due" && value && !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error("invalid date");
  return { ids, patch: { [COLUMN[op]]: value || null } };
}
