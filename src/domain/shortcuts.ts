// Keyboard shortcuts: which key does what. Typing in a field or holding a modifier never triggers one.
export type Shortcut = "search" | "new" | "next" | "prev" | "help";

const KEYS: Record<string, Shortcut> = { "/": "search", n: "new", j: "next", k: "prev", "?": "help" };

export function shortcutFor(e: { key: string; ctrlKey: boolean; metaKey: boolean; altKey: boolean; typing: boolean }): Shortcut | null {
  if (e.typing || e.ctrlKey || e.metaKey || e.altKey) return null;
  return KEYS[e.key] ?? null;
}
