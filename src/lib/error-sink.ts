// Error tracking. ERROR_SINK = off (default) | log | sentry. Events carry only the kind of failure,
// its codes and the stack frames (code locations). The message is dropped: it can quote email or task text.
import { describeError } from "@/lib/log";

type Env = Record<string, string | undefined>;
export type ErrorEvent = { context: string; kind: string; frames: string[] };

export function scrubError(context: string, error: unknown): ErrorEvent {
  const stack = typeof (error as { stack?: unknown } | null)?.stack === "string" ? (error as { stack: string }).stack : "";
  // Only "    at ..." lines; the first stack line holds the message.
  const frames = stack.split("\n").filter((l) => /^\s+at /.test(l)).slice(0, 20).map((l) => l.trim().slice(0, 200));
  return { context: context.slice(0, 100), kind: describeError(error).slice(0, 100), frames };
}

// Sentry DSN: https://<key>@<host>/<project id>. Posts one envelope; failures never reach the caller.
function sentryRequest(dsn: string, event: ErrorEvent): { url: string; body: string } {
  const u = new URL(dsn);
  const projectId = u.pathname.replace(/^\//, "");
  const url = `${u.protocol}//${u.host}/api/${projectId}/envelope/?sentry_key=${u.username}&sentry_version=7`;
  const payload = {
    message: `${event.context}: ${event.kind}`,
    level: "error",
    platform: "node",
    extra: { frames: event.frames },
  };
  const body = [JSON.stringify({ dsn }), JSON.stringify({ type: "event" }), JSON.stringify(payload)].join("\n");
  return { url, body };
}

export async function reportError(
  context: string,
  error: unknown,
  env: Env = process.env,
  send: typeof fetch = fetch,
): Promise<void> {
  const sink = env.ERROR_SINK ?? "off";
  if (sink === "off") return;
  const event = scrubError(context, error);
  try {
    if (sink === "log") console.error(JSON.stringify(event));
    else if (sink === "sentry" && env.ERROR_SINK_DSN) {
      const { url, body } = sentryRequest(env.ERROR_SINK_DSN, event);
      await send(url, { method: "POST", body, headers: { "content-type": "application/x-sentry-envelope" } });
    }
  } catch {
    // Reporting must never break the request that failed.
  }
}
