// Cursor paging: lists load 50 rows at a time, newest first, and continue after the last row seen.

export const PAGE_SIZE = 50;

export type Cursor = { at: string; id: string };

export const encodeCursor = (c: Cursor): string => Buffer.from(JSON.stringify([c.at, c.id])).toString("base64url");

// A bad or tampered cursor means "start from the top".
export function decodeCursor(raw: string | undefined): Cursor | null {
  if (!raw) return null;
  try {
    const [at, id] = JSON.parse(Buffer.from(raw, "base64url").toString());
    return typeof at === "string" && (typeof id === "string" || typeof id === "number") && !Number.isNaN(Date.parse(at)) && /^[\w-]+$/.test(String(id))
      ? { at, id: String(id) }
      : null;
  } catch {
    return null;
  }
}

// PostgREST `or` filter for rows strictly after the cursor when ordered by (column desc, id desc).
export const afterFilter = (column: string, c: Cursor): string =>
  `${column}.lt."${c.at}",and(${column}.eq."${c.at}",id.lt.${c.id})`;

export type Page<T> = { rows: T[]; next: string | null };

// Takes PAGE_SIZE + 1 fetched rows: the extra one only says there is more.
export function toPage<T>(fetched: T[], cursorOf: (row: T) => Cursor): Page<T> {
  const rows = fetched.slice(0, PAGE_SIZE);
  return { rows, next: fetched.length > PAGE_SIZE ? encodeCursor(cursorOf(rows[rows.length - 1])) : null };
}
