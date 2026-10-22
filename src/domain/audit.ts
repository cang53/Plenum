export type AuditRow = {
  created_at: string;
  project_id: string;
  actor_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string;
  source_message_id: string | null;
};

const columns: (keyof AuditRow)[] = [
  "created_at",
  "project_id",
  "actor_id",
  "action",
  "entity_type",
  "entity_id",
  "source_message_id",
];

// Quote every field; a leading = + - @ would run as a formula in a spreadsheet, so it gets a '.
export const cell = (v: string | null) => {
  const s = v ?? "";
  return `"${(/^[=+\-@\t\r]/.test(s) ? `'${s}` : s).replaceAll('"', '""')}"`;
};

export function auditCsv(rows: AuditRow[]): string {
  const lines = [columns.map((c) => cell(c)).join(",")];
  for (const r of rows) lines.push(columns.map((c) => cell(r[c])).join(","));
  return lines.join("\r\n") + "\r\n";
}
