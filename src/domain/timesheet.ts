import type { Checked } from "./settings";

export type HoursInput = { taskId: string; date: string; hours: number };

const day = 86400000;

// Monday of the week holding the given YYYY-MM-DD date (UTC, so no timezone drift).
export function weekStart(date: string): string {
  const d = new Date(`${date}T00:00:00Z`);
  return new Date(d.getTime() - ((d.getUTCDay() + 6) % 7) * day).toISOString().slice(0, 10);
}

export function weekDays(start: string): string[] {
  const t = Date.parse(`${start}T00:00:00Z`);
  return Array.from({ length: 7 }, (_, i) => new Date(t + i * day).toISOString().slice(0, 10));
}

export function shiftWeek(start: string, weeks: number): string {
  return new Date(Date.parse(`${start}T00:00:00Z`) + weeks * 7 * day).toISOString().slice(0, 10);
}

// Grid cells are named `h:<taskId>:<date>`; blank cells are skipped, 0 clears an entry. Same limit as the database: 0 to 24 hours, two decimals.
export function checkGrid(form: { entries(): Iterable<[string, FormDataEntryValue]> }): Checked<HoursInput[]> {
  const out: HoursInput[] = [];
  for (const [name, raw] of form.entries()) {
    const m = /^h:([0-9a-f-]{36}):(\d{4}-\d{2}-\d{2})$/.exec(name);
    const text = String(raw).trim().replace(",", ".");
    if (!m || !text) continue;
    const hours = Number(text);
    if (!Number.isFinite(hours) || hours < 0 || hours > 24 || Math.abs(Math.round(hours * 100) - hours * 100) > 1e-6) return { ok: false, error: "hours.invalid" };
    out.push({ taskId: m[1], date: m[2], hours: Math.round(hours * 100) / 100 });
  }
  return { ok: true, value: out };
}

export type WeekDecision = "approved" | "sent_back";

export function checkDecision(form: { get(k: string): unknown }): { week: string; user: string; decision: WeekDecision; note: string } | null {
  const week = String(form.get("week") ?? "");
  const decision = form.get("decision");
  if (weekStart(week) !== week || (decision !== "approved" && decision !== "sent_back")) return null;
  return { week, user: String(form.get("user") ?? ""), decision, note: String(form.get("note") ?? "").trim().slice(0, 500) };
}
