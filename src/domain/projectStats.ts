export type StatTask = { project_id: string; title: string; status: string; due_date: string | null; is_milestone: boolean };
export type Health = "ok" | "warn" | "bad";
export type ProjectStats = { done: number; total: number; blocked: number; health: Health; next: { title: string; date: string | null } | null };

// Progress, blocked count, health and next milestone per project. Off track: an open task is past its due date; at risk: a task is blocked.
export function projectStats(tasks: StatTask[], today: string): Record<string, ProjectStats> {
  const out: Record<string, ProjectStats> = {};
  for (const t of tasks) {
    const s = (out[t.project_id] ??= { done: 0, total: 0, blocked: 0, health: "ok", next: null });
    s.total++;
    if (t.status === "done") { s.done++; continue; }
    if (t.status === "blocked") s.blocked++;
    if (t.due_date && t.due_date < today) s.health = "bad";
    else if (t.status === "blocked" && s.health === "ok") s.health = "warn";
    if (t.is_milestone && (!s.next || (t.due_date ?? "9999") < (s.next.date ?? "9999"))) s.next = { title: t.title, date: t.due_date };
  }
  return out;
}

export const worstHealth = (list: Health[]): Health => (list.includes("bad") ? "bad" : list.includes("warn") ? "warn" : "ok");
