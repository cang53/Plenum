// Rewards are on unless the workspace turned them off everywhere (site "") or for this site.
export function rewardsOn(offSites: string[], site: string): boolean {
  return !offSites.includes("") && !offSites.includes(site.trim());
}

// The settings form: one site per line, plus an "everywhere" tick.
export function switchList(everywhere: boolean, lines: string): string[] {
  const sites = lines.split("\n").map((s) => s.trim()).filter(Boolean).slice(0, 100);
  return [...new Set(everywhere ? ["", ...sites] : sites)].filter((s) => s.length <= 80);
}

// A project's rewards show unless switched off everywhere or at every site its tasks use.
export function projectRewardsOn(offSites: string[], sites: string[]): boolean {
  const used = [...new Set(sites.map((s) => s.trim()).filter(Boolean))];
  return !offSites.includes("") && (used.length === 0 || used.some((s) => !offSites.includes(s)));
}

export type StreakTask = { dueDate: string | null; status: string; updatedAt: string; createdAt?: string };

const DAY = 86400000;
const monday = (d: Date) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - ((d.getUTCDay() + 6) % 7)));

// Weeks in a row (this week back, Monday to Sunday UTC) where no task was overdue without an update that week.
// "Done" and "updated" both use updated_at, the last touch, so a later edit can only shorten the streak. Team level only.
export function streakWeeks(tasks: StreakTask[], today: string): number {
  const thisWeek = monday(new Date(today)).getTime();
  // A project cannot have a streak older than its first task.
  const known = tasks.flatMap((t) => (t.createdAt ? [new Date(t.createdAt).getTime()] : []));
  const born = known.length ? Math.min(...known) : -Infinity;
  let weeks = 0;
  for (let start = thisWeek; weeks < 104 && start + 7 * DAY > born; start -= 7 * DAY) {
    const end = start + 7 * DAY;
    const slipping = tasks.some((t) => {
      const touched = new Date(t.updatedAt).getTime();
      const finished = t.status === "done" && touched < end;
      const overdue = t.dueDate !== null && new Date(t.dueDate).getTime() < end - DAY;
      return overdue && !finished && !(touched >= start && touched < end);
    });
    if (slipping) break;
    weeks++;
  }
  return weeks;
}

// A risk raised at least 14 days before its due date earns the early warning badge.
export function isEarlyWarning(createdAt: string, dueDate: string | null): boolean {
  return !!dueDate && Date.parse(dueDate) - Date.parse(createdAt.slice(0, 10)) >= 14 * 86_400_000;
}
