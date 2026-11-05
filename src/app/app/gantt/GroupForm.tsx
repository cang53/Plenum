"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { GanttGroup } from "@/domain/gantt";
import { addGroup } from "./actions";

type Text = { add: string; name: string; parent: string; top: string; error: string };

// A manager adds a group, at the top or inside another one.
export function GroupForm({ projectId, groups, text }: { projectId: string; groups: GanttGroup[]; text: Text }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [parent, setParent] = useState("");
  const [failed, setFailed] = useState(false);
  const [busy, start] = useTransition();
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    start(async () => {
      try { await addGroup(projectId, name, parent || null); setName(""); setFailed(false); router.refresh(); } catch { setFailed(true); }
    });
  };
  return (
    <form className="gantt-group-form" onSubmit={submit}>
      <input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} required aria-label={text.name} placeholder={text.name} />
      <select value={parent} onChange={(e) => setParent(e.target.value)} aria-label={text.parent}>
        <option value="">{text.top}</option>
        {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
      </select>
      <button type="submit" className="btn" disabled={busy || !name.trim()}>{text.add}</button>
      {failed && <span role="alert">{text.error}</span>}
    </form>
  );
}
