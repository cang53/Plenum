// The scheduled background jobs, run from one endpoint. Each job is claimed first so a repeat call is a no-op.
import { sendDigests, supabaseDigestRows } from "./digest-run";
import type { EmailSender } from "./email";

export type JobResult = { ran: boolean; detail?: string; error?: boolean };
export type JobStore = {
  claim: (job: string, minHours: number) => Promise<boolean>;
  finish: (job: string, ok: boolean, detail: string) => Promise<void>;
  failedEmails: () => Promise<{ workspaceId: string; projectId?: string; to: string[]; subject: string; bodyText: string; attempt: number }[]>;
  digestRows: Parameters<typeof sendDigests>[0];
};

export async function runJobs(store: JobStore, sender: EmailSender, onError: (e: unknown) => void = () => {}): Promise<Record<string, JobResult>> {
  const jobs: Record<string, [number, () => Promise<string>]> = {
    digest: [20, async () => `${await sendDigests(store.digestRows, sender, onError)} sent`],
    "retry-send": [0, async () => {
      let sent = 0;
      for (const m of await store.failedEmails()) {
        try { await sender.send({ ...m, attempt: m.attempt + 1 }); sent++; } catch (e) { onError(e); }
      }
      return `${sent} resent`;
    }],
  };
  const out: Record<string, JobResult> = {};
  for (const [name, [minHours, run]] of Object.entries(jobs)) {
    if (!(await store.claim(name, minHours))) { out[name] = { ran: false }; continue; }
    try {
      const detail = await run();
      await store.finish(name, true, detail);
      out[name] = { ran: true, detail };
    } catch (e) {
      onError(e);
      await store.finish(name, false, "failed");
      out[name] = { ran: true, error: true };
    }
  }
  return out;
}

export function supabaseJobStore(url: string, key: string): JobStore {
  const headers = { apikey: key, authorization: `Bearer ${key}`, "content-type": "application/json" };
  const rpc = async (fn: string, body: unknown) => {
    const res = await fetch(`${url}/rest/v1/rpc/${fn}`, { method: "POST", headers, body: JSON.stringify(body) });
    if (!res.ok) throw new Error(`${fn} failed: ${res.status}`);
    return res.json();
  };
  return {
    claim: async (job, minHours) => (await rpc("claim_job", { p_job: job, p_min: `${minHours} hours` })) === true,
    async finish(job, ok, detail) {
      await fetch(`${url}/rest/v1/job_runs?job=eq.${job}`, { method: "PATCH", headers, body: JSON.stringify({ ok, detail }) });
    },
    failedEmails: async () =>
      ((await rpc("claim_failed_emails", { p_limit: 20 })) as Record<string, unknown>[]).map((r) => ({
        workspaceId: r.workspace_id as string, projectId: (r.project_id as string | null) ?? undefined, to: r.to_addresses as string[],
        subject: r.subject as string, bodyText: r.body_text as string, attempt: r.attempt as number,
      })),
    digestRows: supabaseDigestRows(url, key),
  };
}
