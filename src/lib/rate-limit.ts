// Fixed-window limiter, kept in memory per server instance. It blunts floods on public
// endpoints; it is not a global quota (each serverless instance counts on its own).
export function createRateLimiter(limit: number, windowMs: number, now: () => number = Date.now) {
  const hits = new Map<string, { start: number; count: number }>();
  return (key: string): boolean => {
    const t = now();
    const hit = hits.get(key);
    if (!hit || t - hit.start >= windowMs) {
      if (hits.size > 10_000) hits.clear();
      hits.set(key, { start: t, count: 1 });
      return true;
    }
    hit.count += 1;
    return hit.count <= limit;
  };
}

export function clientKey(request: Request): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

// Shared limiter backed by the database counter (rate_limit_hit), so it holds across server
// instances. `hit` calls the database; if that fails, the in-memory limiter still applies.
export function createPersistentLimiter(
  hit: (key: string, limit: number, windowSeconds: number) => Promise<boolean>,
  limit: number,
  windowMs: number,
) {
  const fallback = createRateLimiter(limit, windowMs);
  return async (key: string): Promise<boolean> => {
    try {
      return await hit(key, limit, Math.ceil(windowMs / 1000));
    } catch {
      return fallback(key);
    }
  };
}

export function restRateLimitHit(supabaseUrl: string, apiKey: string) {
  return async (key: string, limit: number, windowSeconds: number): Promise<boolean> => {
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/rate_limit_hit`, {
      method: "POST",
      headers: { apikey: apiKey, authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
      body: JSON.stringify({ p_key: key, p_limit: limit, p_window_seconds: windowSeconds }),
    });
    if (!response.ok) throw new Error(`rate_limit_hit failed: ${response.status}`);
    return (await response.json()) === true;
  };
}
