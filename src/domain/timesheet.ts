// Monday of the week that holds a date (ISO weeks, as the database checks), as YYYY-MM-DD.
export function weekStart(date: string): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return d.toISOString().slice(0, 10);
}

export type WeekDecision = "approved" | "sent_back";

export function checkDecision(form: { get(k: string): unknown }): { week: string; user: string; decision: WeekDecision; note: string } | null {
  const week = String(form.get("week") ?? "");
  const decision = form.get("decision");
  if (weekStart(week) !== week || (decision !== "approved" && decision !== "sent_back")) return null;
  return { week, user: String(form.get("user") ?? ""), decision, note: String(form.get("note") ?? "").trim().slice(0, 500) };
}
