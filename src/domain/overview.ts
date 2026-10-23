// Overview numbers: aggregate task status per project, never per person.
import { STATUSES, type BoardTask, type TaskStatus } from "./board";

export type Pulse = { counts: Record<TaskStatus, number>; total: number; percentDone: number; attention: BoardTask[] };

// Attention items are blocked tasks and open tasks past their due date (both dates as YYYY-MM-DD).
export function summarize(tasks: BoardTask[], today: string): Pulse {
  const counts = Object.fromEntries(STATUSES.map((s) => [s, tasks.filter((t) => t.status === s).length])) as Record<TaskStatus, number>;
  const attention = tasks
    .filter((t) => t.status === "blocked" || (t.status !== "done" && t.dueDate !== null && t.dueDate < today))
    .sort((a, b) => (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999"));
  return { counts, total: tasks.length, percentDone: tasks.length ? Math.round((counts.done / tasks.length) * 100) : 0, attention };
}

export type PhaseProgress = { phase: string | null; done: number; blocked: number; active: number; total: number };

// Task counts per phase in first-seen order; whole-phase numbers only, never per person.
export function byPhase(tasks: BoardTask[]): PhaseProgress[] {
  const rows = new Map<string | null, PhaseProgress>();
  for (const t of tasks) {
    const r = rows.get(t.phase) ?? { phase: t.phase, done: 0, blocked: 0, active: 0, total: 0 };
    r.total += 1;
    if (t.status === "done") r.done += 1;
    else if (t.status === "blocked") r.blocked += 1;
    else if (t.status === "in_progress") r.active += 1;
    rows.set(t.phase, r);
  }
  return [...rows.values()];
}

// Open tasks due Monday to Sunday of the week holding today, and how many of those are blocked or already late.
export function dueThisWeek(tasks: BoardTask[], today: string): { due: number; atRisk: number } {
  const d = new Date(`${today}T00:00:00Z`);
  const monday = new Date(d.getTime() - ((d.getUTCDay() + 6) % 7) * 86400000);
  const from = monday.toISOString().slice(0, 10);
  const to = new Date(monday.getTime() + 6 * 86400000).toISOString().slice(0, 10);
  const due = tasks.filter((t) => t.status !== "done" && t.dueDate !== null && t.dueDate >= from && t.dueDate <= to);
  return { due: due.length, atRisk: due.filter((t) => t.status === "blocked" || t.dueDate! < today).length };
}
