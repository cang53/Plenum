import { handlePastedMessage } from "@/server/dev-inbound";
import { inboundConfig, inboundDeps } from "@/server/inbound-config";

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
  return Response.json(body, { status });
}
