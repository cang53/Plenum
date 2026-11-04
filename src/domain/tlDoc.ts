// The saved drawing of one timeline: rows, items and style. Everything coming from the database or the browser goes through cleanDoc.
export const SHAPES = ["pill", "square", "arrow"] as const;
export const SCALES = ["week", "month", "quarter", "year"] as const;
export const FONTS = ["sans", "serif", "mono"] as const;
export const PAGES = ["16:9", "a4", "letter"] as const;
export type Shape = (typeof SHAPES)[number];
export type Scale = (typeof SCALES)[number];
export type Font = (typeof FONTS)[number];
export type Page = (typeof PAGES)[number];

export type TlRow = { id: string; label: string; owner: string };
type Base = { id: string };
export type TlBar = Base & { kind: "bar"; row: string; label: string; start: string; end: string; color: string; shape: Shape; progress: number; taskId?: string };
export type TlMilestone = Base & { kind: "milestone"; row: string; label: string; date: string; color: string; taskId?: string };
export type TlShade = Base & { kind: "shade"; label: string; start: string; end: string; color: string };
export type TlBracket = Base & { kind: "bracket"; row: string; label: string; start: string; end: string; color: string };
export type TlArrow = Base & { kind: "arrow"; from: string; to: string };
export type TlItem = TlBar | TlMilestone | TlShade | TlBracket | TlArrow;
export type LegendEntry = { color: string; label: string };

export type TlDoc = {
  v: 1; title: string; subtitle: string; scale: Scale; showToday: boolean; showLegend: boolean; ownerColumn: boolean;
  font: Font; fontSize: number; page: Page; background: string; textColor: string; rangeStart: string; rangeEnd: string;
  rows: TlRow[]; items: TlItem[]; legend: LegendEntry[];
};

export const STATUS_COLORS = { done: "#047857", active: "#4f46e5", planned: "#b45309", milestone: "#be123c" } as const;
export const PALETTE = [STATUS_COLORS.done, STATUS_COLORS.active, STATUS_COLORS.planned, STATUS_COLORS.milestone, "#0369a1", "#475467"];

export const emptyDoc = (title = ""): TlDoc => ({
  v: 1, title, subtitle: "", scale: "month", showToday: true, showLegend: true, ownerColumn: true, font: "sans", fontSize: 12, page: "16:9",
  background: "#ffffff", textColor: "#0f1420", rangeStart: "", rangeEnd: "", rows: [], items: [],
  legend: [{ color: STATUS_COLORS.done, label: "" }, { color: STATUS_COLORS.active, label: "" }, { color: STATUS_COLORS.planned, label: "" }],
});

// --- dates: whole days since 1970, so there is no time zone to get wrong
export const isIsoDate = (s: unknown): s is string => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s) && toIso(dayNumber(s)) === s;
export const dayNumber = (iso: string): number => { const [y, m, d] = iso.split("-").map(Number); return Math.round(Date.UTC(y, m - 1, d) / 86400000); };
export const toIso = (n: number): string => new Date(n * 86400000).toISOString().slice(0, 10);
export const addDays = (iso: string, n: number): string => toIso(dayNumber(iso) + n);

const HEX = /^#[0-9a-fA-F]{6}$/;
const color = (v: unknown, fallback: string) => (typeof v === "string" && HEX.test(v) ? v.toLowerCase() : fallback);
const str = (v: unknown, max: number) => (typeof v === "string" ? v.slice(0, max) : "");
const num = (v: unknown, lo: number, hi: number, fallback: number) => (typeof v === "number" && Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : fallback);
const oneOf = <T extends string>(list: readonly T[], v: unknown, fallback: T): T => (list.includes(v as T) ? (v as T) : fallback);
const flag = (v: unknown, fallback: boolean) => (typeof v === "boolean" ? v : fallback);
const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const dateOr = (v: unknown, fallback: string) => (isIsoDate(v) ? v : fallback);

export const MAX_ROWS = 100;
export const MAX_ITEMS = 500;

// Turns anything into a safe document: unknown fields are dropped, bad values replaced, counts capped, items kept only if their row exists.
export function cleanDoc(raw: unknown, title = ""): TlDoc {
  const d = emptyDoc(title);
  if (!isObj(raw)) return d;
  const today = toIso(Math.floor(Date.now() / 86400000));
  const out: TlDoc = {
    ...d, title: str(raw.title, 200) || title, subtitle: str(raw.subtitle, 300), scale: oneOf(SCALES, raw.scale, d.scale), showToday: flag(raw.showToday, true),
    showLegend: flag(raw.showLegend, true), ownerColumn: flag(raw.ownerColumn, true), font: oneOf(FONTS, raw.font, "sans"), fontSize: num(raw.fontSize, 8, 24, 12),
    page: oneOf(PAGES, raw.page, "16:9"), background: color(raw.background, "#ffffff"), textColor: color(raw.textColor, "#0f1420"),
    rangeStart: isIsoDate(raw.rangeStart) ? raw.rangeStart : "", rangeEnd: isIsoDate(raw.rangeEnd) ? raw.rangeEnd : "",
  };
  const ids = new Set<string>();
  const fresh = (v: unknown) => { const id = str(v, 40); if (!id || ids.has(id)) return null; ids.add(id); return id; };
  const rows = Array.isArray(raw.rows) ? raw.rows.slice(0, MAX_ROWS) : [];
  out.rows = rows.flatMap((r) => { if (!isObj(r)) return []; const id = fresh(r.id); return id ? [{ id, label: str(r.label, 120), owner: str(r.owner, 60) }] : []; });
  const rowIds = new Set(out.rows.map((r) => r.id));
  const items = Array.isArray(raw.items) ? raw.items.slice(0, MAX_ITEMS) : [];
  const kept: TlItem[] = [];
  for (const it of items) {
    if (!isObj(it)) continue;
    const id = fresh(it.id);
    if (!id) continue;
    const row = str(it.row, 40);
    const start = dateOr(it.start, today);
    const end = dateOr(it.end, start);
    const [s, e] = dayNumber(end) < dayNumber(start) ? [end, start] : [start, end];
    const label = str(it.label, 120);
    const taskId = typeof it.taskId === "string" && it.taskId ? { taskId: it.taskId.slice(0, 60) } : {};
    if (it.kind === "bar" && rowIds.has(row)) kept.push({ id, kind: "bar", row, label, start: s, end: e, color: color(it.color, STATUS_COLORS.active), shape: oneOf(SHAPES, it.shape, "pill"), progress: Math.round(num(it.progress, 0, 100, 0)), ...taskId });
    else if (it.kind === "milestone" && rowIds.has(row)) kept.push({ id, kind: "milestone", row, label, date: dateOr(it.date, today), color: color(it.color, STATUS_COLORS.milestone), ...taskId });
    else if (it.kind === "bracket" && rowIds.has(row)) kept.push({ id, kind: "bracket", row, label, start: s, end: e, color: color(it.color, "#344054") });
    else if (it.kind === "shade") kept.push({ id, kind: "shade", label, start: s, end: e, color: color(it.color, STATUS_COLORS.active) });
    else if (it.kind === "arrow") kept.push({ id, kind: "arrow", from: str(it.from, 40), to: str(it.to, 40) });
    else ids.delete(id);
  }
  const bars = new Set(kept.filter((i) => i.kind === "bar").map((i) => i.id));
  out.items = kept.filter((i) => i.kind !== "arrow" || (bars.has(i.from) && bars.has(i.to) && i.from !== i.to));
  const legend = Array.isArray(raw.legend) ? raw.legend.slice(0, 8) : null;
  if (legend) out.legend = legend.flatMap((l) => (isObj(l) ? [{ color: color(l.color, "#475467"), label: str(l.label, 40) }] : []));
  return out;
}

export const newId = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

// --- Gantt link
export type GanttTask = { id: string; title: string; startDate: string | null; dueDate: string | null; isMilestone: boolean; status: string; ownerName: string | null };
const statusColor = (s: string) => (s === "done" ? STATUS_COLORS.done : s === "todo" ? STATUS_COLORS.planned : s === "blocked" ? STATUS_COLORS.milestone : STATUS_COLORS.active);
const statusProgress = (s: string) => (s === "done" ? 100 : 0);

// Copies the chosen Gantt tasks into the document: a task with dates becomes a row with a bar, a milestone goes on the Milestones row. Tasks already copied are skipped.
export function addFromGantt(doc: TlDoc, tasks: GanttTask[], milestonesLabel: string): TlDoc {
  const have = new Set(doc.items.flatMap((i) => ("taskId" in i && i.taskId ? [i.taskId] : [])));
  const rows = [...doc.rows];
  const items = [...doc.items];
  for (const t of tasks) {
    if (have.has(t.id) || !t.startDate && !t.dueDate) continue;
    const start = (t.startDate ?? t.dueDate)!;
    const end = (t.dueDate ?? t.startDate)!;
    if (t.isMilestone) {
      let row = rows.find((r) => r.id === "milestones");
      if (!row) { row = { id: "milestones", label: milestonesLabel, owner: "" }; rows.push(row); }
      items.push({ id: newId(), kind: "milestone", row: row.id, label: t.title, date: end, color: STATUS_COLORS.milestone, taskId: t.id });
    } else {
      const row = { id: newId(), label: t.title, owner: t.ownerName ?? "" };
      rows.push(row);
      items.push({ id: newId(), kind: "bar", row: row.id, label: t.title, start, end, color: statusColor(t.status), shape: "pill", progress: statusProgress(t.status), taskId: t.id });
    }
  }
  return cleanDoc({ ...doc, rows, items });
}

// Only on request: copies the current Gantt dates, name and status onto the linked items. Style the person chose is kept.
export function refreshFromGantt(doc: TlDoc, tasks: GanttTask[]): TlDoc {
  const by = new Map(tasks.map((t) => [t.id, t]));
  const items = doc.items.map((i) => {
    const t = "taskId" in i && i.taskId ? by.get(i.taskId) : undefined;
    if (!t || (!t.startDate && !t.dueDate)) return i;
    const start = (t.startDate ?? t.dueDate)!;
    const end = (t.dueDate ?? t.startDate)!;
    if (i.kind === "bar") return { ...i, label: t.title, start, end, progress: t.status === "done" ? 100 : i.progress };
    if (i.kind === "milestone") return { ...i, label: t.title, date: end };
    return i;
  });
  return cleanDoc({ ...doc, items });
}
