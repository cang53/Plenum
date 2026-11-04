// Finds earlier risks and issues that read like this one: shared meaningful words, no model call.
const STOP = new Set(["that", "this", "with", "from", "have", "will", "been", "were", "into", "than", "then", "they", "them", "their", "there", "about", "could", "would", "should", "past", "after", "before", "over", "more", "less", "also", "some", "when", "which"]);

export const riskWords = (text: string): Set<string> =>
  new Set(text.toLowerCase().split(/[^a-z0-9à-ÿ]+/).filter((w) => w.length >= 4 && !STOP.has(w)));

export type SimilarCandidate = { id: string; title: string; details: string };
export type Similar<T> = T & { similarity: number };

export function findSimilar<T extends SimilarCandidate>(subject: { title: string; details: string }, candidates: T[], limit = 5, min = 0.2): Similar<T>[] {
  const base = riskWords(`${subject.title} ${subject.title} ${subject.details}`);
  if (base.size === 0) return [];
  return candidates
    .map((c) => {
      const other = riskWords(`${c.title} ${c.title} ${c.details}`);
      const shared = [...base].filter((w) => other.has(w)).length;
      return { ...c, similarity: shared / (base.size + other.size - shared || 1) };
    })
    .filter((c) => c.similarity >= min)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, limit);
}
