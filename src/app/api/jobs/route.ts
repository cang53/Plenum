import { emailSender } from "@/server/email-config";
import { runJobs, supabaseJobStore } from "@/server/jobs";
import { teamsReaderFromEnv } from "@/server/teams";
import { logError } from "@/lib/log";

export const dynamic = "force-dynamic";

// A scheduler calls this (hourly is fine) with the shared secret. Without a configured secret it stays closed.
export async function POST(request: Request): Promise<Response> {
  const secret = process.env.JOBS_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) return new Response("Forbidden", { status: 403 });
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return new Response("Not configured", { status: 503 });
  return Response.json(await runJobs({ ...supabaseJobStore(url, key), readTeams: teamsReaderFromEnv() }, emailSender(), (e) => logError("background job failed", e)));
}
