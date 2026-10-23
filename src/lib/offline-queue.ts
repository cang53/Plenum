// Offline queue for task status and notes, plus the last project view. Everything is encrypted at rest. Storage, key and the network call are passed in so tests can mock them.
import { open, seal } from "./offline-crypto";

export type Vault = { s: Pick<Storage, "getItem" | "setItem" | "removeItem">; key: CryptoKey };
export type Change = { taskId: string; baseStatus: string; status?: string; note?: string };
export type Snapshot = { savedAt: string; project: string; tasks: { id: string; title: string; status: string }[] };
export type SendResult = "ok" | "conflict";

export const QUEUE_KEY = "plenum:offline:queue";
export const VIEW_KEY = "plenum:offline:view";

const read = <T,>(v: Vault, key: string, fallback: T) => open<T>(v.key, v.s.getItem(key), fallback);
const write = async (v: Vault, key: string, value: unknown) => v.s.setItem(key, await seal(v.key, value));

export const readQueue = (v: Vault) => read<Change[]>(v, QUEUE_KEY, []);
export const readSnapshot = (v: Vault) => read<Snapshot | null>(v, VIEW_KEY, null);
export const saveSnapshot = (v: Vault, snap: Snapshot) => write(v, VIEW_KEY, snap);
export const wipe = (s: Pick<Storage, "removeItem">) => { s.removeItem(VIEW_KEY); s.removeItem(QUEUE_KEY); };

// One entry per task: the newest status wins, notes pile up, and the status the person first saw stays the base for conflict checks.
export async function enqueue(v: Vault, c: Change): Promise<Change[]> {
  const queue = await readQueue(v);
  const at = queue.findIndex((q) => q.taskId === c.taskId);
  if (at < 0) queue.push(c);
  else {
    const old = queue[at];
    queue[at] = { taskId: c.taskId, baseStatus: old.baseStatus, status: c.status ?? old.status, note: [old.note, c.note].filter(Boolean).join("\n") || undefined };
  }
  await write(v, QUEUE_KEY, queue);
  return queue;
}

// Sends entries in order. A thrown error means the network is down: stop and keep the rest for next time.
export async function flush(v: Vault, send: (c: Change) => Promise<SendResult>): Promise<{ synced: number; conflicts: Change[] }> {
  const queue = await readQueue(v);
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
    await write(v, QUEUE_KEY, queue);
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
