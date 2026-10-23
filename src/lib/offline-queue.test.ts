import { describe, expect, it } from "vitest";
import { enqueue, flush, planChange, readQueue, type Change } from "./offline-queue";

const store = () => {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) };
};

describe("offline queue", () => {
  it("keeps one entry per task: newest status, first base, notes joined", () => {
    const s = store();
    enqueue(s, { taskId: "a", baseStatus: "todo", status: "in_progress" });
    enqueue(s, { taskId: "a", baseStatus: "in_progress", status: "done", note: "x" });
    enqueue(s, { taskId: "a", baseStatus: "done", note: "y" });
    expect(readQueue(s)).toEqual([{ taskId: "a", baseStatus: "todo", status: "done", note: "x\ny" }]);
  });
  it("sends everything when the network is back and empties the queue", async () => {
    const s = store();
    enqueue(s, { taskId: "a", baseStatus: "todo", status: "done" });
    enqueue(s, { taskId: "b", baseStatus: "todo", note: "n" });
    const sent: Change[] = [];
    const r = await flush(s, async (c) => (sent.push(c), "ok"));
    expect(r).toEqual({ synced: 2, conflicts: [] });
    expect(readQueue(s)).toEqual([]);
  });
  it("keeps unsent entries when the network drops mid-way", async () => {
    const s = store();
    enqueue(s, { taskId: "a", baseStatus: "todo", status: "done" });
    enqueue(s, { taskId: "b", baseStatus: "todo", status: "done" });
    let n = 0;
    const r = await flush(s, async () => { if (n++) throw new Error("offline"); return "ok"; });
    expect(r.synced).toBe(1);
    expect(readQueue(s).map((c) => c.taskId)).toEqual(["b"]);
  });
  it("reports conflicts and removes them from the queue", async () => {
    const s = store();
    enqueue(s, { taskId: "a", baseStatus: "todo", status: "done" });
    const r = await flush(s, async () => "conflict");
    expect(r.conflicts).toHaveLength(1);
    expect(readQueue(s)).toEqual([]);
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
