// Search and timeline filters live in the URL; bad values are dropped instead of failing.
import { ITEM_KINDS, type ItemKind } from "./linking";

export type Filters = { from?: string; to?: string; sender?: string; kind?: ItemKind; task?: string };

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function parseFilters(raw: Record<string, string | undefined>): Filters {
  const date = (v?: string) => (v && DATE.test(v) && !Number.isNaN(Date.parse(v)) ? v : undefined);
  const sender = raw.sender?.trim().slice(0, 200);
  return {
    from: date(raw.from),
    to: date(raw.to),
    sender: sender || undefined,
    kind: ITEM_KINDS.find((k) => k === raw.kind),
    task: raw.task && UUID.test(raw.task) ? raw.task : undefined,
  };
}

// Only the filters that are set, ready for a link's query string.
export const filterParams = (f: Filters): Record<string, string> =>
  Object.fromEntries(Object.entries(f).filter(([, v]) => v)) as Record<string, string>;

// A date filter covers the whole day, so the end is the start of the next day.
export const dayStart = (d: string): string => `${d}T00:00:00Z`;
export const dayEnd = (d: string): string => new Date(Date.parse(dayStart(d)) + 864e5).toISOString();
