import type { MessageKey } from "@/lib/messages";

const SLUG = /^[a-z0-9][a-z0-9-]{1,62}$/;

export type Checked<T> = { ok: true; value: T } | { ok: false; error: MessageKey };

export function checkName(raw: string): Checked<string> {
  const value = raw.trim();
  return value ? { ok: true, value } : { ok: false, error: "settings.invalidName" };
}

// Same rule as the database check; people may type capitals or spaces around it.
export function checkSlug(raw: string): Checked<string> {
  const value = raw.trim().toLowerCase();
  return SLUG.test(value) ? { ok: true, value } : { ok: false, error: "settings.invalidSlug" };
}
