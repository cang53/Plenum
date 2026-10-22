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
