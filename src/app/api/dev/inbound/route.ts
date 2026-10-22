import { handlePastedMessage } from "@/server/dev-inbound";
import { inboundConfig, inboundDeps } from "@/server/inbound-config";
import { aiAsk, supabaseTriageIo, triageMessage } from "@/server/triage-run";
import { logError } from "@/lib/log";

// Local only: paste a message as JSON {slug, from, subject, body} to store it as if SES had received it.
export async function POST(request: Request): Promise<Response> {
  if (process.env.NODE_ENV === "production") return new Response("Not found", { status: 404 });
  const config = inboundConfig();
  if (!config) return new Response("Inbound email is not configured", { status: 503 });
  let input;
  try {
    input = await request.json();
  } catch {
    return new Response("Not JSON", { status: 400 });
  }
  const { status, body } = await handlePastedMessage(input ?? {}, inboundDeps(config).storeEmail);
  if (body.id) {
    // Triage is best effort: a failure must not lose the stored message.
    await triageMessage(body.id, supabaseTriageIo(config.supabaseUrl, config.serviceRoleKey), aiAsk()).catch((error) => logError("triage failed", error));
  }
  return Response.json(body, { status });
}
