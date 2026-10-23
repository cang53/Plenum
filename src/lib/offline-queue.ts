// Offline queue for task status and notes, plus the last project view. Storage and the network call are passed in so tests can mock both.
export type Change = { taskId: string; baseStatus: string; status?: string; note?: string };
export type Snapshot = { savedAt: string; project: string; tasks: { id: string; title: string; status: string }[] };
export type SendResult = "ok" | "conflict";

export const QUEUE_KEY = "plenum:offline:queue";
export const VIEW_KEY = "plenum:offline:view";

function read<T>(s: Pick<Storage, "getItem">, key: string, fallback: T): T {
  try { return JSON.parse(s.getItem(key) ?? "") as T; } catch { return fallback; }
}

export const readQueue = (s: Pick<Storage, "getItem">) => read<Change[]>(s, QUEUE_KEY, []);
export const readSnapshot = (s: Pick<Storage, "getItem">) => read<Snapshot | null>(s, VIEW_KEY, null);
export const saveSnapshot = (s: Pick<Storage, "setItem">, v: Snapshot) => s.setItem(VIEW_KEY, JSON.stringify(v));

// One entry per task: the newest status wins, notes pile up, and the status the person first saw stays the base for conflict checks.
export function enqueue(s: Pick<Storage, "getItem" | "setItem">, c: Change): Change[] {
  const queue = readQueue(s);
  const at = queue.findIndex((q) => q.taskId === c.taskId);
  if (at < 0) queue.push(c);
  else {
    const old = queue[at];
    queue[at] = { taskId: c.taskId, baseStatus: old.baseStatus, status: c.status ?? old.status, note: [old.note, c.note].filter(Boolean).join("\n") || undefined };
  }
  s.setItem(QUEUE_KEY, JSON.stringify(queue));
  return queue;
}

// Sends entries in order. A thrown error means the network is down: stop and keep the rest for next time.
export async function flush(s: Pick<Storage, "getItem" | "setItem">, send: (c: Change) => Promise<SendResult>): Promise<{ synced: number; conflicts: Change[] }> {
  const queue = readQueue(s);
  const conflicts: Change[] = [];
  let synced = 0;
  for (const c of [...queue]) {
    try {
      if ((await send(c)) === "conflict") conflicts.push(c);
      else synced++;
    } catch {
      break;
    }
    queue.shift();
    s.setItem(QUEUE_KEY, JSON.stringify(queue));
  }
  return { synced, conflicts };
}

// What to write for one queued change, given the task as it is now. A status that moved on since the person saw it is skipped (conflict); a note is only appended, so it never conflicts.
export function planChange(current: { status: string; details: string | null }, c: Change): { patch: { status?: string; details?: string }; conflict: boolean } {
  const patch: { status?: string; details?: string } = {};
  const conflict = c.status !== undefined && current.status !== c.baseStatus && current.status !== c.status;
  if (c.status !== undefined && !conflict) patch.status = c.status;
  if (c.note) patch.details = [current.details, c.note].filter(Boolean).join("\n");
  return { patch, conflict };
}
