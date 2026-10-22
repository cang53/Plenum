// Board view logic: the same tasks as the Gantt view, grouped into status columns.

export type TaskStatus = "todo" | "in_progress" | "blocked" | "done";

export const STATUSES: readonly TaskStatus[] = ["todo", "in_progress", "blocked", "done"];

export type BoardTask = {
  id: string;
  title: string;
  status: TaskStatus;
  phase: string | null;
  ownerName: string | null;
  dueDate: string | null;
  position: number;
};

export type BoardColumn = { status: TaskStatus; tasks: BoardTask[] };

export type BoardFilter = { phase?: string; owner?: string };

export function buildColumns(tasks: BoardTask[], filter: BoardFilter = {}): BoardColumn[] {
  const visible = tasks.filter(
    (task) =>
      (!filter.phase || task.phase === filter.phase) &&
      (!filter.owner || task.ownerName === filter.owner),
  );
  return STATUSES.map((status) => ({
    status,
    tasks: visible
      .filter((task) => task.status === status)
      .sort((a, b) => a.position - b.position || a.title.localeCompare(b.title)),
  }));
}

// Moves a task to the end of another column; returns a new list.
export function moveTask(tasks: BoardTask[], taskId: string, status: TaskStatus): BoardTask[] {
  const task = tasks.find((t) => t.id === taskId);
  if (!task || task.status === status) return tasks;
  const last = Math.max(-1, ...tasks.filter((t) => t.status === status).map((t) => t.position));
  return tasks.map((t) => (t.id === taskId ? { ...t, status, position: last + 1 } : t));
}

export function distinct(values: (string | null)[]): string[] {
  return [...new Set(values.filter((v): v is string => Boolean(v)))].sort();
}
