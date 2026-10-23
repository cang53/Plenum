"use client";

import { useEffect, useState } from "react";
import { browserVault } from "@/lib/offline-crypto";
import { enqueue, flush, readQueue, saveSnapshot, type Snapshot } from "@/lib/offline-queue";
import { syncTaskChange } from "./actions";

type Labels = { title: string; hint: string; status: string; note: string; add: string; pending: string; synced: string; conflicts: string; statuses: Record<string, string> };

// Quick status and note changes that survive a dropped connection. Also keeps the last view for the offline page.
export function OfflineTasks({ project, tasks, labels }: { project: string; tasks: Snapshot["tasks"]; labels: Labels }) {
  const [pending, setPending] = useState(0);
  const [message, setMessage] = useState("");
  const [shown, setShown] = useState(tasks);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const sync = async () => {
    const v = await browserVault();
    if (!(await readQueue(v)).length) return;
    const { synced, conflicts } = await flush(v, syncTaskChange);
    setPending((await readQueue(v)).length);
    setMessage(conflicts.length ? `${labels.conflicts}: ${conflicts.length}` : synced ? `${labels.synced}: ${synced}` : "");
  };
  useEffect(() => {
    void browserVault().then(async (v) => {
      await saveSnapshot(v, { savedAt: new Date().toISOString(), project, tasks });
      setPending((await readQueue(v)).length);
      void sync();
    });
    window.addEventListener("online", sync);
    return () => window.removeEventListener("online", sync);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const change = async (id: string, patch: { status?: string; note?: string }) => {
    const task = shown.find((t) => t.id === id);
    if (!task) return;
    setPending((await enqueue(await browserVault(), { taskId: id, baseStatus: task.status, ...patch })).length);
    if (patch.status) setShown(shown.map((t) => (t.id === id ? { ...t, status: patch.status! } : t)));
    if (patch.note) setNotes({ ...notes, [id]: "" });
    void sync();
  };
  if (!tasks.length) return null;
  return (
    <section aria-label={labels.title}>
      <h2>{labels.title}</h2>
      <p className="intro">{labels.hint}</p>
      <ul>
        {shown.map((t) => (
          <li key={t.id}>
            <strong>{t.title}</strong>{" "}
            <label>{labels.status}{" "}
              <select value={t.status} onChange={(e) => change(t.id, { status: e.target.value })}>
                {Object.entries(labels.statuses).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </label>{" "}
            <label>{labels.note} <input value={notes[t.id] ?? ""} maxLength={500} onChange={(e) => setNotes({ ...notes, [t.id]: e.target.value })} /></label>{" "}
            <button type="button" className="btn btn-secondary" disabled={!notes[t.id]?.trim()} onClick={() => change(t.id, { note: notes[t.id].trim() })}>{labels.add}</button>
          </li>
        ))}
      </ul>
      <p role="status">{pending ? `${labels.pending}: ${pending}` : message}</p>
    </section>
  );
}
