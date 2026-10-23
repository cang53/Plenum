import type { Checked } from "./settings";
import { cell } from "./audit";

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

export const DAY_TARGET = 8;
export const WEEK_TARGET = 40;

export const sumHours = (xs: (number | undefined)[]): number => Math.round(xs.reduce<number>((a, x) => a + (x ?? 0), 0) * 100) / 100;

// "over" past the target, "met" at or past it for the week, otherwise "under". Days only go over; a short day is normal.
export function targetState(total: number, target: number, week = false): "under" | "met" | "over" {
  if (total > target) return "over";
  return week && total === target ? "met" : "under";
}

// Last week's hours moved forward seven days, for the cells the person has not filled yet.
export function copyWeek(rows: { task_id: string; work_date: string; hours: number }[]): { taskId: string; date: string; hours: number }[] {
  return rows.map((r) => ({ taskId: r.task_id, date: shiftWeek(r.work_date, 1), hours: r.hours }));
}

// Sending a week back needs a note, so the person knows what to change.
export type WeekDecision = "approved" | "sent_back";

export function checkDecision(form: { get(k: string): unknown }): { week: string; user: string; decision: WeekDecision; note: string } | null {
  const week = String(form.get("week") ?? "");
  const decision = form.get("decision");
  if (weekStart(week) !== week || (decision !== "approved" && decision !== "sent_back")) return null;
  const note = String(form.get("note") ?? "").trim().slice(0, 500);
  if (decision === "sent_back" && !note) return null;
  return { week, user: String(form.get("user") ?? ""), decision, note };
}

// Rows ticked in the approvals list are named `pick` with the value `<user>|<week start>`; anything that is not a Monday is dropped.
export function checkPicks(form: { getAll(k: string): unknown[] }): { user: string; week: string }[] {
  return form.getAll("pick").flatMap((v) => {
    const [user, week] = String(v).split("|");
    return user && week && weekStart(week) === week ? [{ user, week }] : [];
  });
}

// ISO week number of the week starting on the given Monday.
export function isoWeek(start: string): number {
  const thursday = new Date(Date.parse(`${start}T00:00:00Z`) + 3 * day);
  return Math.ceil(((thursday.getTime() - Date.UTC(thursday.getUTCFullYear(), 0, 1)) / day + 1) / 7);
}

export type ExportRow = { person: string; task: string; work_date: string; hours: number };

// Same quoting as the audit export, so a name starting with = cannot run as a formula.
export function timesheetCsv(rows: ExportRow[]): string {
  const lines = [["person", "task", "date", "hours"].map((c) => cell(c)).join(",")];
  for (const r of rows) lines.push([r.person, r.task, r.work_date, String(r.hours)].map(cell).join(","));
  return lines.join("\r\n") + "\r\n";
}
