// Is the person reading the last part of the chat? (distance from the bottom in pixels)
export function isNearEnd(scrollHeight: number, scrollY: number, viewport: number, slack = 120): boolean {
  return scrollHeight - scrollY - viewport <= slack;
}

// How many entries were added since last time (removals count as none).
export function countNew(before: number, after: number): number {
  return Math.max(0, after - before);
}

// Which message ids are new, and did they arrive above the old first message (older, prepended) or below (newer, appended)?
export function diffIds(prev: string[], next: string[]): { prepended: string[]; appended: string[] } {
  const known = new Set(prev);
  const added = next.filter((id) => !known.has(id));
  const first = prev.length ? next.indexOf(prev[0]) : -1;
  const prepended = added.filter((id) => first >= 0 && next.indexOf(id) < first);
  return { prepended, appended: added.filter((id) => !prepended.includes(id)) };
}
