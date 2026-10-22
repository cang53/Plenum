// Empty means keep everything; otherwise a whole number of days, at least 30 (the database enforces the same).
export function parseRetention(raw: string): { ok: true; days: number | null } | { ok: false } {
  const s = raw.trim();
  if (s === "") return { ok: true, days: null };
  const n = Number(s);
  return Number.isInteger(n) && n >= 30 && n <= 3650 ? { ok: true, days: n } : { ok: false };
}
