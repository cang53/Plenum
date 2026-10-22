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
