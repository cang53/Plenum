// Offline stand-in for the agent model: reads "Action: ..." lines and "Move <task> to <date>" lines from the message and
// documents. No network. Same shape as the Bedrock answer, so the demo works without a model.
import type { Ask } from "./triage";

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
const DATE = String.raw`(\d{4}-\d{2}-\d{2}|\d{1,2}(?:st|nd|rd|th)?\s+(?:of\s+)?[A-Za-z]{3,9}(?:\s+\d{4})?|[A-Za-z]{3,9}\s+\d{1,2}(?:st|nd|rd|th)?(?:,?\s+\d{4})?)`;
const iso = (y: number, m: number, d: number) => `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

// A date as written in a note, or null. A day and month without a year means the next time it comes round.
export function parseDate(raw: string, today: string): string | null {
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return Number.isNaN(Date.parse(raw)) ? null : raw;
  const a = /^(\d{1,2})(?:st|nd|rd|th)?\s+(?:of\s+)?([A-Za-z]+)(?:\s+(\d{4}))?$/.exec(raw);
  const b = /^([A-Za-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?(?:,?\s+(\d{4}))?$/.exec(raw);
  const [day, mon, year] = a ? [a[1], a[2], a[3]] : b ? [b[2], b[1], b[3]] : [];
  const m = MONTHS.indexOf((mon ?? "").slice(0, 3).toLowerCase());
  if (!day || m < 0) return null;
  const now = new Date(`${today}T00:00:00Z`);
  let y = year ? Number(year) : now.getUTCFullYear();
  if (!year && iso(y, m, Number(day)) < today) y += 1;
  const out = iso(y, m, Number(day));
  return Number.isNaN(Date.parse(out)) ? null : out;
}

const shift = (d: string, days: number) => new Date(Date.parse(`${d}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);
const gap = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / 86_400_000);

export const agentRuleAsk: Ask = async (_system, user) => {
  const section = (name: string, next: string) => new RegExp(`${name}:\\n([\\s\\S]*?)\\n${next}:`).exec(user)?.[1] ?? "";
  const today = /^TODAY: (\S+)/m.exec(user)?.[1] ?? new Date().toISOString().slice(0, 10);
  const tasks = section("TASKS \\(id \\| title \\| start \\| due \\| status\\)", "CHAT").split("\n").flatMap((l) => {
    const [id, title, start, due] = l.replace(/^- /, "").split(" | ");
    return title ? [{ id, title, start, due }] : [];
  });
  const message = section("MESSAGE", "DOCUMENTS");
  const documents = user.slice(user.indexOf("\nDOCUMENTS:\n") + 12);
  const segments = `${message}\n${documents}`.split(/\n+|(?<=[.!?])\s+(?=[A-Z])/).map((s) => s.replace(/^[\s\-*•\d.)]+/, "").trim()).filter(Boolean);
  const actions: Record<string, string | null>[] = [];
  for (const s of segments) {
    const move = new RegExp(String.raw`\b(?:move|postpone|delay|push(?:\s+back)?|reschedule|bring forward)\b.*?\b(?:to|until|till|by)\s+${DATE}`, "i").exec(s);
    const target = move ? parseDate(move[1], today) : null;
    const task = target ? tasks.filter((t) => s.toLowerCase().includes(t.title.toLowerCase())).sort((x, y) => y.title.length - x.title.length)[0] : undefined;
    if (task && target) {
      const by = task.due ? gap(task.due, target) : 0;
      actions.push({ kind: "update_task", task_id: task.id, title: task.title, details: `New finish date ${target}.`, start_date: task.start ? shift(task.start, by) : null, due_date: target, reason: `The note says "${s.slice(0, 200)}".` });
      continue;
    }
    const item = /^(?:action(?:\s+item)?|todo|to-do|task)\s*[:\-–]\s*(.+)$/i.exec(s);
    if (item) {
      const by = new RegExp(String.raw`\s*[,(-]?\s*\b(?:by|due|before|until)\s+${DATE}\)?\s*\.?$`, "i").exec(item[1]);
      const due = by ? parseDate(by[1], today) : null;
      const title = (due && by ? item[1].slice(0, by.index) : item[1]).replace(/[.\s]+$/, "").slice(0, 200);
      if (title) actions.push({ kind: "create_task", task_id: null, title, details: "", start_date: due, due_date: due, reason: `The note says "${s.slice(0, 200)}".` });
    }
  }
  const reply = actions.length
    ? `I found ${actions.length} change${actions.length === 1 ? "" : "s"} to the plan. Review each card under your message. Nothing changes until you accept.`
    : documents.trim()
      ? 'I read the note but found nothing to change. I look for lines like "Action: book the crane by 12 Nov" or "Move pouring to 20 Nov".'
      : "I am here. Tag me and attach a meeting note (docx or PDF) and I will propose changes to the plan for you to accept.";
  return JSON.stringify({ reply, actions });
};
