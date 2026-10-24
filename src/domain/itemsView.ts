export const QUICK_FILTERS = ["all", "mine", "at_risk", "blocked", "week"] as const;
export type QuickFilter = (typeof QUICK_FILTERS)[number];

export const COLUMNS = ["owner", "priority", "due", "site", "costCode"] as const;
export type Column = (typeof COLUMNS)[number];
export const DEFAULT_COLUMNS: readonly Column[] = ["owner", "due"];

type Row = { status: string; dueDate: string | null; ownerId: string | null };

export const parseQuick = (v: string | undefined): QuickFilter => QUICK_FILTERS.find((q) => q === v) ?? "all";

// `col` is absent on first visit (defaults); once the chooser was used it is present, with a "-" placeholder so an empty choice sticks.
export const parseColumns = (v: string | string[] | undefined): readonly Column[] => (v === undefined ? DEFAULT_COLUMNS : COLUMNS.filter((c) => [v].flat().includes(c)));

// At risk matches the Overview: blocked, or open and past its due date. Week is Monday to Sunday, today as YYYY-MM-DD.
export function matchesQuick(r: Row, q: QuickFilter, me: string | null, today: string): boolean {
  const late = r.status !== "done" && r.dueDate !== null && r.dueDate < today;
  if (q === "mine") return me !== null && r.ownerId === me;
  if (q === "blocked") return r.status === "blocked";
  if (q === "at_risk") return r.status === "blocked" || late;
  if (q === "week") {
    const monday = new Date(new Date(`${today}T00:00:00Z`).getTime() - ((new Date(`${today}T00:00:00Z`).getUTCDay() + 6) % 7) * 86400000);
    const from = monday.toISOString().slice(0, 10);
    const to = new Date(monday.getTime() + 6 * 86400000).toISOString().slice(0, 10);
    return r.status !== "done" && r.dueDate !== null && r.dueDate >= from && r.dueDate <= to;
  }
  return true;
}

// One count per quick filter, over every task of the project (not just the loaded page).
export const quickCounts = (rows: Row[], me: string | null, today: string): Record<QuickFilter, number> =>
  Object.fromEntries(QUICK_FILTERS.map((q) => [q, rows.filter((r) => matchesQuick(r, q, me, today)).length])) as Record<QuickFilter, number>;
