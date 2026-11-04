// Reads "X cannot start until Y is finished" style sentences and matches the two parts to real tasks, tolerating typos
// ("convoyer") and extra words. Pure code, so it works with or without the model.
import type { TaskRef } from "./agent";

export type DependencyFound = { predecessorId: string; successorId: string; sentence: string };

const STOP = new Set(["the", "a", "an", "task", "of", "to", "is", "are", "be", "been", "has", "have", "and", "for", "all", "completely", "fully", "totally", "finished", "done", "complete", "completed", "ready", "we", "can", "start", "begin"]);
const stem = (w: string) => w.replace(/(ation|ing|ed|es|s)$/, (m, _x, i) => (i >= 4 ? "" : m));
const words = (s: string) => s.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter((w) => w && !STOP.has(w)).map(stem);

function distance(a: string, b: string): number {
  let row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const next = [i];
    for (let j = 1; j <= b.length; j++) next[j] = Math.min(next[j - 1] + 1, row[j] + 1, row[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    row = next;
  }
  return row[b.length];
}
const same = (a: string, b: string) => a === b || (Math.min(a.length, b.length) >= 5 && distance(a, b) <= 2);

// The task whose words are best covered by the phrase, if at least 60% are.
export function matchTask(phrase: string, tasks: TaskRef[]): TaskRef | null {
  const p = words(phrase);
  let best: { t: TaskRef; score: number } | null = null;
  for (const t of tasks) {
    const w = words(t.title);
    if (!w.length) continue;
    const hit = w.filter((x) => p.some((y) => same(x, y))).length;
    const score = hit / w.length + hit / Math.max(p.length, 1) / 10; // the second term only breaks ties
    if (hit / w.length >= 0.6 && (!best || score > best.score)) best = { t, score };
  }
  return best?.t ?? null;
}

const NOT = String.raw`(?:can ?not|can't|cant|may not|must not|mustn't|should not|shouldn't|won't|is not allowed to|are not allowed to|not able to)`;
const UNTIL = String.raw`(?:until|before|till|prior to|unless)`;
const DONE = String.raw`(?:finished|done|complete|completed|installed|ready|over|built|delivered)`;
// Each rule returns [waiting task phrase, task-it-waits-for phrase].
const RULES: ((s: string) => [string, string] | null)[] = [
  (s) => {
    const m = new RegExp(String.raw`^(.*?)\s*\b${NOT}\s+(?:be\s+)?(?:start(?:ed)?|begin|begun)(?:\s+(.+?))?\s+\b${UNTIL}\s+(.+)$`, "i").exec(s);
    if (!m) return null;
    const who = /^(?:we|you|they|i|people|nobody|no one|it)?$/i.test(m[1].trim());
    return [who ? m[2] ?? "" : m[1], m[3]];
  },
  (s) => { const m = new RegExp(String.raw`^(.+?)\s+(?:must|has to|have to|needs? to|should)\s+(?:be\s+)?(?:\w+\s+){1,2}?(?:before|prior to)\s+(.+?)(?:\s+(?:can|may|could|is able to)\s+(?:start|begin)|\s+(?:starts?|begins?))?$`, "i").exec(s); return m ? [m[2], m[1]] : null; },
  (s) => { const m = /^(.+?)\s+(?:depends? on|is dependent on|waits? for|is blocked by|comes after|follows)\s+(.+)$/i.exec(s); return m ? [m[1], m[2]] : null; },
  (s) => { const m = /^(.+?)\s+(?:blocks|precedes|comes before|goes before)\s+(.+)$/i.exec(s); return m ? [m[2], m[1]] : null; },
  (s) => { const m = new RegExp(String.raw`^(?:after|once|when)\s+(.+?)\s+(?:is|are|has been|have been)\s+${DONE}\s*,?\s*(?:then\s+)?(.+?)\s+(?:can|may|could)\s+(?:start|begin)$`, "i").exec(s); return m ? [m[2], m[1]] : null; },
  (s) => { const m = /^(.+?)\s+(?:can|may|could)?\s*(?:starts?|begins?)\s+(?:only\s+)?(?:after|once|when)\s+(.+)$/i.exec(s); return m ? [m[1], m[2]] : null; },
];

// Resolved links, plus the sentences that read like a dependency but whose tasks could not be matched.
export function findDependencies(text: string, tasks: TaskRef[]): { found: DependencyFound[]; unresolved: string[] } {
  const found: DependencyFound[] = [];
  const unresolved: string[] = [];
  const segments = text.replace(/@(agent|plenum)\b[,:]?/gi, " ").split(/\n+|(?<=[.!?])\s+/).map((s) => s.replace(/^[\s\-*•]+|[\s.!?]+$/g, "").replace(/["“”']/g, "").trim()).filter(Boolean);
  for (const s of segments) {
    const parts = RULES.map((r) => r(s)).find(Boolean);
    if (!parts) continue;
    const [waiting, first] = parts;
    const succ = matchTask(waiting, tasks);
    const pred = matchTask(first, tasks);
    if (succ && pred && succ.id !== pred.id) {
      if (!found.some((f) => f.predecessorId === pred.id && f.successorId === succ.id)) found.push({ predecessorId: pred.id, successorId: succ.id, sentence: s.slice(0, 200) });
    } else unresolved.push(s);
  }
  return { found, unresolved };
}
