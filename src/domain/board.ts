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
  priority: "low" | "normal" | "high";
  position: number;
  // Per-project task number, from 1 and never reused; the number part of the card ID.
  number: number;
  site: string | null;
  // Subject of the message a blocked task was made from, if any.
  waitingOn?: string | null;
};

export type BoardColumn = { status: TaskStatus; tasks: BoardTask[] };

export type DueFilter = "overdue" | "week" | "none";

// today is YYYY-MM-DD; needed only for the overdue and this-week filters.
export type BoardFilter = { phase?: string; owner?: string; site?: string; due?: DueFilter; today?: string };

// shortcut: one fixed limit for In progress, until projects can set their own.
export const WIP_LIMIT = 4;

function matchesDue(date: string | null, due: DueFilter, today = ""): boolean {
  if (due === "none") return !date;
  if (!date) return false;
  return due === "overdue" ? date < today : weekStart(date) === weekStart(today);
}

export function buildColumns(tasks: BoardTask[], filter: BoardFilter = {}): BoardColumn[] {
  const visible = tasks.filter(
    (task) =>
      (!filter.phase || task.phase === filter.phase) &&
      (!filter.owner || task.ownerName === filter.owner) &&
      (!filter.site || task.site === filter.site) &&
      (!filter.due || matchesDue(task.dueDate, filter.due, filter.today)),
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

// Card ID prefix from the project name: a code like "P-204" if the name has one, else up to three initials.
export function projectPrefix(name: string): string {
  const code = name.match(/\b[A-Z]{1,4}-\d+\b/)?.[0];
  return code ?? (name.split(/\s+/).filter(Boolean).slice(0, 3).map((w) => w[0]!.toUpperCase()).join("") || "T");
}

// Card ID such as "P-204-21": project prefix and task number.
export function taskKey(prefix: string, number: number): string {
  return `${prefix}-${number}`;
}

// Initials for the owner mark; never a photo or a figure per person.
export function initials(name: string): string {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join("");
}

export type GroupBy = "status" | "phase" | "owner" | "week";

export type BoardGroup = { key: string; tasks: BoardTask[] };

// Monday of the task's due week as YYYY-MM-DD; "" when there is no due date.
export function weekStart(date: string | null): string {
  if (!date) return "";
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return d.toISOString().slice(0, 10);
}

// Groups the already filtered columns' tasks by phase, owner or due week; "" is the group without a value, listed last.
export function groupTasks(tasks: BoardTask[], by: Exclude<GroupBy, "status">): BoardGroup[] {
  const keyOf = (task: BoardTask) => (by === "phase" ? task.phase : by === "owner" ? task.ownerName : weekStart(task.dueDate)) ?? "";
  const keys = [...new Set(tasks.map(keyOf))].sort((a, b) => Number(a === "") - Number(b === "") || a.localeCompare(b));
  return keys.map((key) => ({
    key,
    tasks: tasks.filter((task) => keyOf(task) === key).sort((a, b) => a.position - b.position || a.title.localeCompare(b.title)),
  }));
}
