// Which activity a risk is about, and on which date: read from the title and description. Pure rules; the person decides.
const STOP = new Set(["the", "and", "for", "with", "that", "this", "from", "could", "will", "may", "might", "be", "of", "to", "in", "on", "is", "are", "was", "delay", "delayed", "risk", "issue", "late", "week", "weeks"]);
const words = (s: string) => new Set(s.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 3 && !STOP.has(w)).map((w) => w.replace(/(ing|ed|es|s)$/, "")));

export function suggestTask<T extends { id: string; title: string }>(risk: { title: string; details: string }, tasks: T[]): T | null {
  const mine = words(`${risk.title} ${risk.details}`);
  let best: T | null = null; let top = 0;
  for (const t of tasks) {
    const theirs = words(t.title);
    if (!theirs.size) continue;
    const shared = [...theirs].filter((w) => mine.has(w)).length;
    const score = shared / theirs.size;
    if (shared && (shared >= 2 || score >= 0.5) && score > top) { best = t; top = score; }
  }
  return best;
}

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
const iso = (y: number, m: number, d: number) => new Date(Date.UTC(y, m, d)).toISOString().slice(0, 10);
const mondayOfWeek = (year: number, week: number) => {
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const monday = Date.UTC(year, 0, 4 - ((jan4.getUTCDay() + 6) % 7));
  return new Date(monday + (week - 1) * 7 * 86_400_000).toISOString().slice(0, 10);
};

// The first date the text names: 2026-12-03, "3 December", "December 3", "week 49" or "W49". A bare day or week is taken in the next 6 months.
export function extractDate(text: string, today: string): string | null {
  const y = Number(today.slice(0, 4));
  const near = (d: string) => (d < new Date(Date.parse(today) - 183 * 86_400_000).toISOString().slice(0, 10) ? `${y + 1}${d.slice(4)}` : d);
  const found: { at: number; date: string }[] = [];
  for (const m of text.matchAll(/\b(\d{4})-(\d{2})-(\d{2})\b/g)) found.push({ at: m.index!, date: m[0] });
  for (const m of text.matchAll(/\b(\d{1,2})(?:st|nd|rd|th)?\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\b/gi)) found.push({ at: m.index!, date: near(iso(y, MONTHS.indexOf(m[2].toLowerCase()), Number(m[1]))) });
  for (const m of text.matchAll(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+(\d{1,2})(?:st|nd|rd|th)?\b/gi)) found.push({ at: m.index!, date: near(iso(y, MONTHS.indexOf(m[1].toLowerCase()), Number(m[2]))) });
  for (const m of text.matchAll(/\b(?:week\s*|w)(\d{1,2})\b/gi)) if (Number(m[1]) >= 1 && Number(m[1]) <= 53) found.push({ at: m.index!, date: near(mondayOfWeek(y, Number(m[1]))) });
  return found.sort((a, b) => a.at - b.at)[0]?.date ?? null;
}
