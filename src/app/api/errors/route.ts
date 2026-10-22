import { reportError } from "@/lib/error-sink";
import { clientKey, createRateLimiter } from "@/lib/rate-limit";

const allow = createRateLimiter(10, 60_000);

// Public on purpose, like the health check: browsers report a failure kind (never a message). Capped and rate limited.
export async function POST(request: Request): Promise<Response> {
  if (!allow(clientKey(request))) return new Response(null, { status: 429 });
  const body = (await request.json().catch(() => null)) as { kind?: unknown } | null;
  const kind = typeof body?.kind === "string" ? body.kind.slice(0, 100) : "unknown";
  await reportError("client error", { name: kind });
  return new Response(null, { status: 204 });
}
