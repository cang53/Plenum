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

export type AuditFilters = { from?: string; to?: string; action?: string };

// Same rule as the other filters: bad dates are dropped, action is a short plain word.
export function parseAuditFilters(raw: Record<string, string | undefined>): AuditFilters {
  const date = (v?: string) => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v)) ? v : undefined);
  const action = raw.action?.trim().slice(0, 60);
  return { from: date(raw.from), to: date(raw.to), action: action || undefined };
}
