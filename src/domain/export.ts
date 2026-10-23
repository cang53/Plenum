import { cell } from "./audit";

export type ExportDoc = { exported_at: string } & Record<string, unknown>;

// One CSV per table: columns are the union of the rows' keys; objects and arrays are written as JSON.
export function tableCsv(rows: Record<string, unknown>[]): string {
  const cols = [...new Set(rows.flatMap((r) => Object.keys(r)))];
  const text = (v: unknown) => (v == null ? null : typeof v === "object" ? JSON.stringify(v) : String(v));
  const lines = [cols.map((c) => cell(c)).join(",")];
  for (const r of rows) lines.push(cols.map((c) => cell(text(r[c]))).join(","));
  return lines.join("\r\n") + "\r\n";
}

export const exportTables = [
  "projects", "project_members", "phases", "tasks", "task_dependencies", "messages", "message_attachments",
  "decisions", "risks", "change_requests", "suggestions", "baselines", "baseline_tasks", "status_reports",
  "site_logs", "audit_log",
];
