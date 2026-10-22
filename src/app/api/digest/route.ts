import { emailSender } from "@/server/email-config";
import { sendDigests, supabaseDigestRows } from "@/server/digest-run";
import { logError } from "@/lib/log";

export const dynamic = "force-dynamic";

// A daily scheduler calls this with the shared secret. Without a configured secret it stays closed.
export async function POST(request: Request): Promise<Response> {
  const secret = process.env.DIGEST_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) return new Response("Forbidden", { status: 403 });
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return new Response("Not configured", { status: 503 });
  const sent = await sendDigests(supabaseDigestRows(url, key), emailSender(), (e) => logError("digest email failed", e));
  return Response.json({ sent });
}
