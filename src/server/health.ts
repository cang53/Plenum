import { logError } from "@/lib/log";

export type Health = { ok: boolean; database: "up" | "down" | "not configured"; jobs?: Record<string, { lastRun: string; ok: boolean | null }>; lastInboundAt?: string | null; failedSendAgeMinutes?: number | null };

// Asks the database REST endpoint for one row of nothing; any answer below 500 proves the database is reachable.
export async function checkHealth(
  env: { url?: string; key?: string } = { url: process.env.SUPABASE_URL, key: process.env.SUPABASE_SERVICE_ROLE_KEY },
  doFetch: typeof fetch = fetch,
): Promise<Health> {
  if (!env.url || !env.key) return { ok: false, database: "not configured" };
  try {
    const response = await doFetch(`${env.url}/rest/v1/`, {
      headers: { apikey: env.key, authorization: `Bearer ${env.key}` },
      signal: AbortSignal.timeout(3000),
    });
    if (response.status < 500) return { ok: true, database: "up", jobs: await lastJobRuns(env.url, env.key, doFetch), ...(await queueStats(env.url, env.key, doFetch)) };
    logError("health check failed", { name: "HttpStatus", status: response.status });
  } catch (error) {
    logError("health check failed", error);
  }
  return { ok: false, database: "down" };
}

// Last run of each background job; never fails the health check.
async function lastJobRuns(url: string, key: string, doFetch: typeof fetch): Promise<Health["jobs"]> {
  try {
    const res = await doFetch(`${url}/rest/v1/job_runs?select=job,last_run_at,ok`, {
      headers: { apikey: key, authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) return undefined;
    const rows = (await res.json()) as { job: string; last_run_at: string; ok: boolean | null }[];
    return Object.fromEntries(rows.map((r) => [r.job, { lastRun: r.last_run_at, ok: r.ok }]));
  } catch {
    return undefined;
  }
}

// Time of the newest inbound message and age of the oldest failed send still waiting for a retry; never fails the check.
async function queueStats(url: string, key: string, doFetch: typeof fetch): Promise<Pick<Health, "lastInboundAt" | "failedSendAgeMinutes">> {
  const first = async (path: string, column: string): Promise<string | null> => {
    try {
      const res = await doFetch(`${url}/rest/v1/${path}&limit=1`, { headers: { apikey: key, authorization: `Bearer ${key}` }, signal: AbortSignal.timeout(3000) });
      if (!res.ok) return null;
      return ((await res.json()) as Record<string, string>[])[0]?.[column] ?? null;
    } catch {
      return null;
    }
  };
  const [inbound, failed] = await Promise.all([
    first("messages?select=received_at&order=received_at.desc", "received_at"),
    first("outbox?select=created_at&status=eq.failed&retried=eq.false&order=created_at.asc", "created_at"),
  ]);
  return { lastInboundAt: inbound, failedSendAgeMinutes: failed ? Math.max(0, Math.round((Date.now() - Date.parse(failed)) / 60_000)) : null };
}
