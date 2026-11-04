// Emoji reactions on stream messages. The set matches the database check.
export const REACTION_EMOJIS = ["👍", "❤️", "🎉", "👀", "✅", "😄"] as const;
export type Reaction = { emoji: string; count: number; mine: boolean; agent: boolean };

// One chip per emoji with its count; only whether the signed-in person and CobIA reacted is kept, not who else.
export function groupReactions(rows: { message_id: string; emoji: string; user_id: string | null; agent: boolean }[], me: string | undefined): Map<string, Reaction[]> {
  const out = new Map<string, Reaction[]>();
  for (const r of rows) {
    const list = out.get(r.message_id) ?? [];
    let chip = list.find((c) => c.emoji === r.emoji);
    if (!chip) list.push((chip = { emoji: r.emoji, count: 0, mine: false, agent: false }));
    chip.count++;
    chip.mine ||= !!me && r.user_id === me;
    chip.agent ||= r.agent;
    out.set(r.message_id, list);
  }
  return out;
}

// CobIA's own reaction to a plain message, from word checks only (no model call). Questions get none; at most one emoji.
export function reactionFor(text: string): (typeof REACTION_EMOJIS)[number] | null {
  const t = text.trim();
  if (t.length < 3 || t.includes("?")) return null;
  if (/\b(thanks|thank you|thx|cheers|danke|bedankt|dank je)\b/i.test(t)) return "👍";
  if (/\b(congrat\w*|well done|great news|milestone reached|gefeliciteerd|goed gedaan)\b/i.test(t)) return "🎉";
  if (/\b(urgent|asap|blocked|delayed|delay|late|stuck|problem|spoed|vertraagd|vertraging|probleem)\b/i.test(t)) return "👀";
  if (/\b(done|completed|finished|delivered|approved|signed off|klaar|afgerond|geleverd|goedgekeurd)\b/i.test(t)) return "✅";
  return null;
}
