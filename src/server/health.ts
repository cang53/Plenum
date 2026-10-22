import { logError } from "@/lib/log";

export type Health = { ok: boolean; database: "up" | "down" | "not configured" };

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
    if (response.status < 500) return { ok: true, database: "up" };
    logError("health check failed", { name: "HttpStatus", status: response.status });
  } catch (error) {
    logError("health check failed", error);
  }
  return { ok: false, database: "down" };
}
