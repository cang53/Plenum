"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { browserVault } from "@/lib/offline-crypto";
import { enqueueLog, flushLogs, readLogs } from "@/lib/offline-queue";
import { checkSiteLog } from "@/domain/siteLog";
import { syncSiteLog } from "./actions";

type Labels = { summary: string; offline: string; waiting: string; sent: string; invalid: string };

// The edit form. Offline, a save is kept encrypted on this device and sent when the connection returns.
export function SiteLogForm({ action, projectId, open, labels, children }: { action: (f: FormData) => Promise<void>; projectId: string; open: boolean; labels: Labels; children: ReactNode }) {
  const router = useRouter();
  const [online, setOnline] = useState(true);
  const [waiting, setWaiting] = useState(0);
  const [sent, setSent] = useState(0);
  const [invalid, setInvalid] = useState(false);
  const sync = async () => {
    const v = await browserVault();
    if (!(await readLogs(v)).length) return;
    const r = await flushLogs(v, syncSiteLog);
    setWaiting(r.left);
    if (r.synced) { setSent(r.synced); router.refresh(); }
  };
  useEffect(() => {
    const on = () => { setOnline(true); void sync(); };
    const off = () => setOnline(false);
    void browserVault().then(async (v) => { setOnline(navigator.onLine); setWaiting((await readLogs(v)).length); if (navigator.onLine) void sync(); });
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    if (navigator.onLine) return;
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const input = checkSiteLog(data);
    setInvalid(!input.ok);
    if (!input.ok) return;
    setWaiting((await enqueueLog(await browserVault(), { ...input.value, projectId })).length);
    setSent(0);
  };
  return (
    <>
      {(!online || waiting > 0 || invalid || sent > 0) && (
        <p role="status" className="sl-state" data-offline={online ? undefined : ""}>
          {invalid ? labels.invalid : !online && !waiting ? labels.offline : waiting ? `${labels.waiting}: ${waiting}` : `${labels.sent}: ${sent}`}
        </p>
      )}
      <details id="sl-form" className="sl-edit" open={open}>
        <summary>{labels.summary}</summary>
        <form action={action} onSubmit={submit} className="surface form-card">
          <input type="hidden" name="projectId" value={projectId} />
          {children}
        </form>
      </details>
    </>
  );
}
