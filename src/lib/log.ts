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
