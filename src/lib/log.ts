// Logs a failure without its message: error text can quote email or task contents, so only the kind of failure is kept.
export function describeError(error: unknown): string {
  const e = (error ?? {}) as { name?: unknown; code?: unknown; status?: unknown };
  const parts = [typeof e.name === "string" ? e.name : typeof error];
  if (typeof e.code === "string" || typeof e.code === "number") parts.push(`code=${e.code}`);
  if (typeof e.status === "number") parts.push(`status=${e.status}`);
  return parts.join(" ");
}

export function logError(context: string, error: unknown): void {
  console.error(`${context}: ${describeError(error)}`);
}

export type LogFields = Record<string, string | number | boolean>;

// One JSON line per event. Fields are ids, counts and kinds, never message text or addresses.
export function logEvent(event: string, fields: LogFields = {}): void {
  console.info(JSON.stringify({ event, at: new Date().toISOString(), ...fields }));
}

// Aggregate counter: summed from the log lines by event name, never keyed by person.
export function countEvent(name: "inbound" | "triage" | "send_failure", fields: LogFields = {}): void {
  logEvent("count", { name, n: 1, ...fields });
}

// Reuses an id set by the host's proxy, otherwise makes one, so one request can be followed across log lines.
export function requestId(request: Request): string {
  const given = request.headers.get("x-request-id");
  return given && /^[\w-]{1,64}$/.test(given) ? given : crypto.randomUUID();
}
