import { describe, expect, it } from "vitest";
import { getKey, open, type KeyStore } from "./offline-crypto";
import { enqueue, flush, planChange, QUEUE_KEY, readQueue, readSnapshot, saveSnapshot, VIEW_KEY, wipe, type Change, type Vault } from "./offline-queue";

const keyStore = () => {
  let k: CryptoKey | undefined;
  return { get: async () => k, put: async (n) => void (k = n), clear: async () => void (k = undefined) } as KeyStore;
};
const mem = () => {
  const m = new Map<string, string>();
  return { m, getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k) };
};
const store = async (): Promise<Vault> => ({ s: mem(), key: await getKey(keyStore()) });

describe("offline queue", () => {
  it("keeps one entry per task: newest status, first base, notes joined", async () => {
    const s = await store();
    await enqueue(s, { taskId: "a", baseStatus: "todo", status: "in_progress" });
    await enqueue(s, { taskId: "a", baseStatus: "in_progress", status: "done", note: "x" });
    await enqueue(s, { taskId: "a", baseStatus: "done", note: "y" });
    expect(await readQueue(s)).toEqual([{ taskId: "a", baseStatus: "todo", status: "done", note: "x\ny" }]);
  });
  it("sends everything when the network is back and empties the queue", async () => {
    const s = await store();
    await enqueue(s, { taskId: "a", baseStatus: "todo", status: "done" });
    await enqueue(s, { taskId: "b", baseStatus: "todo", note: "n" });
    const sent: Change[] = [];
    const r = await flush(s, async (c) => (sent.push(c), "ok"));
    expect(r).toEqual({ synced: 2, conflicts: [] });
    expect(await readQueue(s)).toEqual([]);
  });
  it("keeps unsent entries when the network drops mid-way", async () => {
    const s = await store();
    await enqueue(s, { taskId: "a", baseStatus: "todo", status: "done" });
    await enqueue(s, { taskId: "b", baseStatus: "todo", status: "done" });
    let n = 0;
    const r = await flush(s, async () => { if (n++) throw new Error("offline"); return "ok"; });
    expect(r.synced).toBe(1);
    expect((await readQueue(s)).map((c) => c.taskId)).toEqual(["b"]);
  });
  it("reports conflicts and removes them from the queue", async () => {
    const s = await store();
    await enqueue(s, { taskId: "a", baseStatus: "todo", status: "done" });
    const r = await flush(s, async () => "conflict");
    expect(r.conflicts).toHaveLength(1);
    expect(await readQueue(s)).toEqual([]);
  });
});

describe("encryption at rest", () => {
  it("stores no readable text for the queue or the view", async () => {
    const s = await store();
    await enqueue(s, { taskId: "a", baseStatus: "todo", note: "secret-note" });
    await saveSnapshot(s, { savedAt: "now", project: "Secret Tower", tasks: [{ id: "a", title: "secret-task", status: "todo" }] });
    const raw = [...(s.s as ReturnType<typeof mem>).m.values()].join("");
    expect(raw).not.toMatch(/secret/);
    expect((await readSnapshot(s))?.project).toBe("Secret Tower");
  });
  it("uses a non-extractable key", async () => {
    expect((await store()).key.extractable).toBe(false);
  });
  it("falls back to empty (refetch) when the key is lost", async () => {
    const s = await store();
    await enqueue(s, { taskId: "a", baseStatus: "todo", status: "done" });
    await saveSnapshot(s, { savedAt: "now", project: "P", tasks: [] });
    const lost = { ...s, key: await getKey(keyStore()) };
    expect(await readQueue(lost)).toEqual([]);
    expect(await readSnapshot(lost)).toBeNull();
  });
  it("ignores old plain-text data and tampering", async () => {
    const s = await store();
    s.s.setItem(QUEUE_KEY, JSON.stringify([{ taskId: "a", baseStatus: "todo" }]));
    expect(await readQueue(s)).toEqual([]);
    expect(await open(s.key, "AAAA.BBBB", "fb")).toBe("fb");
  });
  it("wipes both entries", async () => {
    const s = await store();
    await enqueue(s, { taskId: "a", baseStatus: "todo", status: "done" });
    await saveSnapshot(s, { savedAt: "now", project: "P", tasks: [] });
    wipe(s.s);
    expect([QUEUE_KEY, VIEW_KEY].map((k) => s.s.getItem(k))).toEqual([null, null]);
  });
});

describe("planChange", () => {
  const c: Change = { taskId: "a", baseStatus: "todo", status: "done", note: "hi" };
  it("applies status and appends the note when nothing changed meanwhile", () => {
    expect(planChange({ status: "todo", details: "old" }, c)).toEqual({ patch: { status: "done", details: "old\nhi" }, conflict: false });
  });
  it("skips a stale status but still adds the note", () => {
    expect(planChange({ status: "blocked", details: null }, c)).toEqual({ patch: { details: "hi" }, conflict: true });
  });
  it("is not a conflict when someone already set the same status", () => {
    expect(planChange({ status: "done", details: "" }, { ...c, note: undefined })).toEqual({ patch: { status: "done" }, conflict: false });
  });
});
