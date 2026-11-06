// Month grid for the Overview: Monday first, marks for milestone and task due dates. Dates are YYYY-MM-DD, months YYYY-MM.
export type CalCell = { n: number | null; today?: boolean; milestone?: boolean; task?: boolean };

export const monthOf = (q: string | undefined, today: string): string => (q && /^\d{4}-(0[1-9]|1[0-2])$/.test(q) ? q : today.slice(0, 7));

export function shiftMonth(month: string, by: number): string {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1 + by, 1)).toISOString().slice(0, 7);
}

export function calendarCells(month: string, today: string, milestones: string[], tasks: string[]): CalCell[] {
  const [y, m] = month.split("-").map(Number);
  const lead = (new Date(Date.UTC(y, m - 1, 1)).getUTCDay() + 6) % 7;
  const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const cells: CalCell[] = Array.from({ length: lead }, () => ({ n: null }));
  for (let d = 1; d <= days; d++) {
    const iso = `${month}-${String(d).padStart(2, "0")}`;
    cells.push({ n: d, today: iso === today || undefined, milestone: milestones.includes(iso) || undefined, task: tasks.includes(iso) || undefined });
  }
  while (cells.length % 7) cells.push({ n: null });
  return cells;
}
