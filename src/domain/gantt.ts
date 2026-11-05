// Gantt layout and critical path. Dates are ISO strings (YYYY-MM-DD); only dated tasks get a bar.
import type { TaskStatus } from "./board";
import type { Dependency, PlanTask } from "./schedule";

// Owner, status, priority and number are for the task column; a task without them still draws.
// forecast is a supplier's date nobody has accepted yet; the chart marks it with a dashed outline.
export type GanttTask = PlanTask & { phase: string | null; phaseId?: string | null; isMilestone?: boolean; ownerName?: string | null; status?: TaskStatus; priority?: "low" | "normal" | "high"; number?: number; forecast?: { date: string; label: string } };
export type GanttBar = { id: string; title: string; phase: string | null; phaseId?: string | null; startDay: number; length: number; start: string; due: string; isMilestone: boolean; ownerName?: string | null; status?: TaskStatus; priority?: "low" | "normal" | "high"; number?: number; forecast?: { date: string; label: string } };

const DAY_MS = 24 * 60 * 60 * 1000;
// Empty days after the last task so the last bars and their labels stay inside the grid.
const TRAILING_DAYS = 21;

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
  const lastDay = Math.max(...dated.map((t) => Math.max(dayOf(t.dueDate), t.forecast ? dayOf(t.forecast.date) : 0)));
  const bars = dated
    // a milestone is a point in time: one day wide, on its due date
    .map((t) => {
      const info = { id: t.id, title: t.title, phase: t.phase, phaseId: t.phaseId, start: t.startDate, due: t.dueDate, ownerName: t.ownerName, status: t.status, priority: t.priority, number: t.number, forecast: t.forecast };
      return t.isMilestone
        ? { ...info, startDay: dayOf(t.dueDate) - firstDay, length: 1, isMilestone: true }
        : { ...info, startDay: dayOf(t.startDate) - firstDay, length: dayOf(t.dueDate) - dayOf(t.startDate) + 1, isMilestone: false };
    })
    .sort((a, b) => a.startDay - b.startDay || a.title.localeCompare(b.title));
  return { bars, firstDay, totalDays: lastDay - firstDay + 1 + TRAILING_DAYS };
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

export type BaselineDates = Record<string, { startDate: string; dueDate: string }>;

// Days each task's due date has moved since the baseline (positive = later). Tasks not in the baseline are left out.
export function slipDays(tasks: PlanTask[], baseline: BaselineDates): Map<string, number> {
  const slip = new Map<string, number>();
  for (const t of tasks) {
    const base = baseline[t.id];
    if (t.dueDate && base) slip.set(t.id, dayOf(t.dueDate) - dayOf(base.dueDate));
  }
  return slip;
}

export type Zoom = "week" | "month" | "quarter";
export const DAY_PX: Record<Zoom, number> = { week: 21, month: 10, quarter: 4 };

// A group of tasks; groups nest through parentId. afterTaskId puts a nested group right below one task of its parent.
export type GanttGroup = { id: string; name: string; parentId: string | null; afterTaskId?: string | null };
// A group row (group set) spans everything inside it; a task row has bar set. An empty group has no span.
export type GanttRow = { key: string; group: GanttGroup | null; depth: number; bar?: GanttBar; startDay: number; endDay: number; count: number };

// Rows in drawing order: groups by earliest start, nested ones inside their parent, ungrouped tasks last.
// Tasks that carry only a group name (the plan studio's proposals) get a top-level group of that name.
export function layoutRows(bars: GanttBar[], groups: GanttGroup[], folded: Set<string>, opts: { first?: (b: GanttBar) => boolean; hideEmpty?: boolean } = {}): GanttRow[] {
  const all = new Map(groups.map((g) => [g.id, g]));
  const keyOf = (b: GanttBar) => (b.phaseId && all.has(b.phaseId) ? b.phaseId : b.phase ? `name:${b.phase}` : null);
  for (const b of bars) { const k = keyOf(b); if (k && !all.has(k)) all.set(k, { id: k, name: b.phase!, parentId: null }); }
  const kids = new Map<string | null, GanttGroup[]>();
  const loops = (g: GanttGroup) => { let c: string | null = g.parentId; for (let n = 0; c && n < 50; n++) { if (c === g.id) return true; c = all.get(c)?.parentId ?? null; } return false; };
  for (const g of all.values()) { const p = g.parentId && all.has(g.parentId) && !loops(g) ? g.parentId : null; kids.set(p, [...(kids.get(p) ?? []), g]); }
  const own = new Map<string | null, GanttBar[]>();
  for (const b of bars) own.set(keyOf(b), [...(own.get(keyOf(b)) ?? []), b]);
  const span = (id: string, seen = new Set<string>()): { start: number; end: number; count: number; first: boolean } => {
    seen.add(id);
    let r = { start: Infinity, end: -Infinity, count: 0, first: false };
    for (const b of own.get(id) ?? []) r = { start: Math.min(r.start, b.startDay), end: Math.max(r.end, b.startDay + b.length - 1), count: r.count + 1, first: r.first || !!opts.first?.(b) };
    for (const c of kids.get(id) ?? []) if (!seen.has(c.id)) { const x = span(c.id, seen); r = { start: Math.min(r.start, x.start), end: Math.max(r.end, x.end), count: r.count + x.count, first: r.first || x.first }; }
    return r;
  };
  const sorted = (list: GanttGroup[]) => list.map((g) => ({ g, s: span(g.id) })).sort((a, b) => Number(b.s.first) - Number(a.s.first) || a.s.start - b.s.start).map((x) => x.g);
  const rows: GanttRow[] = [];
  const emit = (g: GanttGroup, depth: number, path: Set<string>) => {
    const s = span(g.id);
    if (opts.hideEmpty && !s.count) return;
    rows.push({ key: `group-${g.id}`, group: g, depth, startDay: s.start, endDay: s.end, count: s.count });
    if (folded.has(g.id) || path.has(g.id)) return;
    const inside = (kids.get(g.id) ?? []).filter((c) => !path.has(c.id));
    const tasks = own.get(g.id) ?? [];
    const placed = new Set<string>();
    // a group anchored to a task sits one step in, under that task
    const nested = (c: GanttGroup, anchored = false) => emit(c, depth + (anchored ? 2 : 1), new Set([...path, g.id]));
    for (const b of tasks) {
      rows.push({ key: b.id, group: null, depth: depth + 1, bar: b, startDay: b.startDay, endDay: b.startDay + b.length - 1, count: 0 });
      for (const c of inside.filter((c) => c.afterTaskId === b.id)) { placed.add(c.id); nested(c, true); }
    }
    for (const c of sorted(inside.filter((c) => !placed.has(c.id)))) nested(c);
  };
  for (const g of sorted(kids.get(null) ?? [])) emit(g, 0, new Set());
  for (const b of own.get(null) ?? []) rows.push({ key: b.id, group: null, depth: 0, bar: b, startDay: b.startDay, endDay: b.startDay + b.length - 1, count: 0 });
  return rows;
}

// Day offsets (from firstDay) where the time scale gets a label: Mondays for week, month starts for month, quarter starts for quarter.
export function scaleTicks(firstDay: number, totalDays: number, zoom: Zoom): { offset: number; iso: string }[] {
  const ticks: { offset: number; iso: string }[] = [];
  for (let offset = 0; offset < totalDays; offset++) {
    const iso = isoOf(firstDay + offset);
    const d = new Date(`${iso}T00:00:00Z`);
    const hit = zoom === "week" ? d.getUTCDay() === 1 : d.getUTCDate() === 1 && (zoom === "month" || d.getUTCMonth() % 3 === 0);
    if (hit) ticks.push({ offset, iso });
  }
  return ticks;
}
