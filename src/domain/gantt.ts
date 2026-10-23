// Gantt layout and critical path. Dates are ISO strings (YYYY-MM-DD); only dated tasks get a bar.
import type { Dependency, PlanTask } from "./schedule";

export type GanttTask = PlanTask & { phase: string | null };
export type GanttBar = { id: string; title: string; phase: string | null; startDay: number; length: number; start: string; due: string };

const DAY_MS = 24 * 60 * 60 * 1000;

export function dayOf(iso: string): number {
  return Math.round(Date.parse(iso) / DAY_MS);
}

export function isoOf(day: number): string {
  return new Date(day * DAY_MS).toISOString().slice(0, 10);
}

// Moves both dates by the same number of days; a null date stays null.
export function shiftDates(task: PlanTask, days: number): { startDate: string; dueDate: string } {
  if (!task.startDate || !task.dueDate) throw new Error("task has no dates");
  return { startDate: isoOf(dayOf(task.startDate) + days), dueDate: isoOf(dayOf(task.dueDate) + days) };
}

// Bars sit on a day grid that starts at the earliest start; length counts both end days.
export function buildBars(tasks: GanttTask[]): { bars: GanttBar[]; firstDay: number; totalDays: number } {
  const dated = tasks.filter((t): t is GanttTask & { startDate: string; dueDate: string } => !!t.startDate && !!t.dueDate);
  if (!dated.length) return { bars: [], firstDay: 0, totalDays: 0 };
  const firstDay = Math.min(...dated.map((t) => dayOf(t.startDate)));
  const lastDay = Math.max(...dated.map((t) => dayOf(t.dueDate)));
  const bars = dated
    .map((t) => ({ id: t.id, title: t.title, phase: t.phase, startDay: dayOf(t.startDate) - firstDay, length: dayOf(t.dueDate) - dayOf(t.startDate) + 1, start: t.startDate, due: t.dueDate }))
    .sort((a, b) => a.startDay - b.startDay || a.title.localeCompare(b.title));
  return { bars, firstDay, totalDays: lastDay - firstDay + 1 };
}

// Tasks on the longest chain of dependent dated tasks. Loops are ignored (the database refuses them).
export function criticalPath(tasks: PlanTask[], dependencies: Dependency[]): Set<string> {
  const dated = new Map(tasks.filter((t) => t.startDate && t.dueDate).map((t) => [t.id, t]));
  const preds = new Map<string, string[]>();
  for (const d of dependencies) {
    if (dated.has(d.predecessorId) && dated.has(d.successorId)) preds.set(d.successorId, [...(preds.get(d.successorId) ?? []), d.predecessorId]);
  }
  const length = (id: string) => dayOf(dated.get(id)!.dueDate!) - dayOf(dated.get(id)!.startDate!) + 1;
  const best = new Map<string, { total: number; prev: string | null }>();
  const visit = (id: string, path: Set<string>): number => {
    const known = best.get(id);
    if (known) return known.total;
    let prev: string | null = null;
    let top = 0;
    for (const p of preds.get(id) ?? []) {
      if (path.has(p)) continue;
      const total = visit(p, new Set(path).add(id));
      if (total > top) { top = total; prev = p; }
    }
    best.set(id, { total: top + length(id), prev });
    return top + length(id);
  };
  let end: string | null = null;
  let longest = 0;
  for (const id of dated.keys()) {
    const total = visit(id, new Set());
    if (total > longest) { longest = total; end = id; }
  }
  const chain = new Set<string>();
  for (let id = end; id; id = best.get(id)!.prev) chain.add(id);
  return chain.size > 1 ? chain : new Set();
}
