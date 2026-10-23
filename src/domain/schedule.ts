// Plan checks shown in the Gantt and board views. Dates are ISO strings (YYYY-MM-DD).

export type PlanTask = {
  id: string;
  title: string;
  startDate: string | null;
  dueDate: string | null;
};

// kind and lagDays default to finish-to-start with no lag.
export type Dependency = { predecessorId: string; successorId: string; kind?: "FS" | "SS" | "FF" | "SF"; lagDays?: number };

export type Conflict = {
  predecessor: PlanTask;
  successor: PlanTask;
  // Days the successor starts too early.
  overlapDays: number;
};

const DAY_MS = 24 * 60 * 60 * 1000;

function days(from: string, to: string): number {
  return Math.round((Date.parse(to) - Date.parse(from)) / DAY_MS);
}

// Finish-to-start: a successor should start after its predecessor's due date (plus lag).
// Start-to-start, finish-to-finish and start-to-finish compare the matching ends, which may be the same day.
export function findConflicts(tasks: PlanTask[], dependencies: Dependency[]): Conflict[] {
  const byId = new Map(tasks.map((task) => [task.id, task]));
  const conflicts: Conflict[] = [];
  for (const { predecessorId, successorId, kind = "FS", lagDays = 0 } of dependencies) {
    const predecessor = byId.get(predecessorId);
    const successor = byId.get(successorId);
    const from = kind[0] === "S" ? predecessor?.startDate : predecessor?.dueDate;
    const to = kind[1] === "S" ? successor?.startDate : successor?.dueDate;
    if (!predecessor || !successor || !from || !to) continue;
    const slack = days(from, to) - lagDays;
    if (kind === "FS" ? slack <= 0 : slack < 0) conflicts.push({ predecessor, successor, overlapDays: kind === "FS" ? 1 - slack : -slack });
  }
  return conflicts;
}

// True when adding predecessor -> successor would close a loop.
export function wouldCreateLoop(
  dependencies: Dependency[],
  predecessorId: string,
  successorId: string,
): boolean {
  if (predecessorId === successorId) return true;
  const next = new Map<string, string[]>();
  for (const d of dependencies) {
    next.set(d.predecessorId, [...(next.get(d.predecessorId) ?? []), d.successorId]);
  }
  const seen = new Set<string>();
  const stack = [successorId];
  while (stack.length > 0) {
    const id = stack.pop()!;
    if (id === predecessorId) return true;
    if (seen.has(id)) continue;
    seen.add(id);
    stack.push(...(next.get(id) ?? []));
  }
  return false;
}
