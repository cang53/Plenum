"use client";

import { useEffect, useState } from "react";
import { readQueue, readSnapshot, type Snapshot } from "@/lib/offline-queue";

// Read-only copy of the last project view saved on this device.
export function OfflineView({ labels }: { labels: { empty: string; saved: string; pending: string; statuses: Record<string, string> } }) {
  const [view, setView] = useState<Snapshot | null | undefined>(undefined);
  const [pending, setPending] = useState(0);
  // Storage only exists in the browser, so it is read after mount.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setView(readSnapshot(localStorage)); setPending(readQueue(localStorage).length); }, []);
  if (view === undefined) return null;
  if (!view) return <p>{labels.empty}</p>;
  return (
    <>
      <p className="eyebrow">{view.project}</p>
      <p className="intro">{labels.saved}: {new Date(view.savedAt).toLocaleString()}{pending ? ` · ${labels.pending}: ${pending}` : ""}</p>
      <ul>{view.tasks.map((t) => <li key={t.id}>{t.title} ({labels.statuses[t.status] ?? t.status})</li>)}</ul>
    </>
  );
}
