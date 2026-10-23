import type { HoursInput } from "./timesheet";

export type Activity = { task_id: string; title: string; source_message_id: string | null; active_on: string };

export const TIMESHEET_DRAFT_SYSTEM_PROMPT =
  'You draft a work week. Each line is a task the person touched on a day. Give hours for every line, at most 8 per day in total, in steps of 0.25. Answer with only JSON: {"lines":[{"task":"<task_id>","date":"<date>","hours":<number>}]}.';

export function buildTimesheetDraftPrompt(activity: Activity[]): string {
  return activity.map((a) => `${a.task_id} ${a.active_on} ${a.title}`).join("\n");
}

// Rules fallback: each day's 8 hours split evenly over the tasks touched that day, in quarter hours.
export function rulesDraft(activity: Activity[]): HoursInput[] {
  const perDay = new Map<string, Activity[]>();
  for (const a of activity) perDay.set(a.active_on, [...(perDay.get(a.active_on) ?? []), a]);
  return [...perDay.entries()].flatMap(([date, rows]) =>
    rows.map((a) => ({ taskId: a.task_id, date, hours: Math.floor((8 / rows.length) * 4) / 4 })),
  );
}

// Keeps only lines for a task and day that were in the activity, with 0 to 8 hours, one per task and day. Null when nothing usable is left.
export function parseTimesheetDraft(answer: string, activity: Activity[]): HoursInput[] | null {
  try {
    const data: unknown = JSON.parse(answer.slice(answer.indexOf("{"), answer.lastIndexOf("}") + 1));
    const lines = (data as { lines?: unknown }).lines;
    if (!Array.isArray(lines)) return null;
    const seen = new Set<string>();
    const out: HoursInput[] = [];
    for (const l of lines as { task?: unknown; date?: unknown; hours?: unknown }[]) {
      const key = `${l?.task}:${l?.date}`;
      const hours = Number(l?.hours);
      if (seen.has(key) || !activity.some((a) => `${a.task_id}:${a.active_on}` === key) || !(hours > 0 && hours <= 8)) continue;
      seen.add(key);
      out.push({ taskId: String(l.task), date: String(l.date), hours: Math.round(hours * 4) / 4 });
    }
    return out.length ? out : null;
  } catch {
    return null;
  }
}
