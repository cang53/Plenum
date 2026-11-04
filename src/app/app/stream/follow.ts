// Is the person reading the last part of the chat? (distance from the bottom in pixels)
export function isNearEnd(scrollHeight: number, scrollY: number, viewport: number, slack = 120): boolean {
  return scrollHeight - scrollY - viewport <= slack;
}

// How many entries were added since last time (removals count as none).
export function countNew(before: number, after: number): number {
  return Math.max(0, after - before);
}
