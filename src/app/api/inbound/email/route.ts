import { handleSesNotification, type SesNotification } from "@/server/inbound-email";
import { inboundConfig, inboundDeps } from "@/server/inbound-config";
import { aiAsk, supabaseTriageIo, triageMessage } from "@/server/triage-run";
import { fetchCertificateCached, isSnsUrl, verifySnsMessage, type SnsMessage } from "@/server/sns";
import { logError } from "@/lib/log";
import { clientKey, createRateLimiter } from "@/lib/rate-limit";

const allow = createRateLimiter(120, 60_000);

// Amazon SES posts each email received at a project address here, through an SNS topic.
// A 5xx answer makes SNS retry, so only failures worth retrying return one.
export async function POST(request: Request): Promise<Response> {
  const config = inboundConfig();
  if (!config) return new Response("Inbound email is not configured", { status: 503 });

  // Before parsing or fetching certificates, so a flood stays cheap. SNS retries a 429 later.
  if (!allow(clientKey(request))) return new Response("Too many requests", { status: 429 });

  let message: SnsMessage;
  try {
    message = JSON.parse(await request.text());
  } catch {
    return new Response("Not an SNS message", { status: 400 });
  }
  if (message.TopicArn !== config.topicArn) return new Response("Unknown topic", { status: 403 });
  if (!(await verifySnsMessage(message, fetchCertificateCached))) {
    return new Response("Bad signature", { status: 403 });
  }

  if (message.Type === "SubscriptionConfirmation") {
    if (!isSnsUrl(message.SubscribeURL)) return new Response("Bad subscribe link", { status: 400 });
    const confirmed = await fetch(message.SubscribeURL!);
    return new Response(null, { status: confirmed.ok ? 204 : 502 });
  }
  if (message.Type !== "Notification") return new Response(null, { status: 204 });

  const result = await handleSesNotification(JSON.parse(message.Message) as SesNotification, inboundDeps(config));
  // Triage is best effort: a failure must not make SNS resend an email that is already stored.
  for (const id of result.stored) {
    await triageMessage(id, supabaseTriageIo(config.supabaseUrl, config.serviceRoleKey), aiAsk()).catch((error) => logError("triage failed", error));
  }
  if (result.skipped) console.info(`inbound email ${message.MessageId} skipped: ${result.skipped}`);
  return Response.json(result);
}
