import { checkHealth } from "@/server/health";

export const dynamic = "force-dynamic";

// Public on purpose: it returns only up or down, never data, so a monitor can poll it.
export async function GET(): Promise<Response> {
  const health = await checkHealth();
  return Response.json(health, { status: health.ok ? 200 : 503, headers: { "cache-control": "no-store" } });
}
