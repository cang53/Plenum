// Plan checks shown in the Gantt and board views. Dates are ISO strings (YYYY-MM-DD).

export type PlanTask = {
  id: string;
  title: string;
  startDate: string | null;
  dueDate: string | null;
};

export type Dependency = { predecessorId: string; successorId: string };

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

// Finish-to-start: a successor should start after its predecessor's due date.
export function findConflicts(tasks: PlanTask[], dependencies: Dependency[]): Conflict[] {
  const byId = new Map(tasks.map((task) => [task.id, task]));
  const conflicts: Conflict[] = [];
  for (const { predecessorId, successorId } of dependencies) {
    const predecessor = byId.get(predecessorId);
    const successor = byId.get(successorId);
    if (!predecessor?.dueDate || !successor?.startDate) continue;
    const gap = days(predecessor.dueDate, successor.startDate);
    if (gap <= 0) conflicts.push({ predecessor, successor, overlapDays: 1 - gap });
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
