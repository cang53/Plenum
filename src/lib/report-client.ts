import { describeError } from "@/lib/log";

// Sends only the failure kind to /api/errors; the server decides whether a sink is on.
export function reportClientError(error: unknown): void {
  void fetch("/api/errors", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ kind: describeError(error) }),
    keepalive: true,
  }).catch(() => {});
}
