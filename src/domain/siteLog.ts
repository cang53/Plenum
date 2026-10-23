import type { Checked } from "./settings";

export type SiteLogInput = { site: string; date: string; weather: string; headcount: number; work: string; delays: string; sourceMessageId?: string };

// Same limits as the database checks; headcount is one total for the site, never a list of people.
export function checkSiteLog(form: { get(k: string): FormDataEntryValue | null | undefined }): Checked<SiteLogInput> {
  const text = (k: string) => String(form.get(k) ?? "").trim();
  const site = text("site");
  const date = text("date");
  const headcount = Number(text("headcount") || 0);
  if (!site || site.length > 100 || !/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date))) return { ok: false, error: "sitelog.invalid" };
  if (!Number.isInteger(headcount) || headcount < 0 || headcount > 100000) return { ok: false, error: "sitelog.invalid" };
  const weather = text("weather"), work = text("work"), delays = text("delays");
  if (weather.length > 100 || work.length > 4000 || delays.length > 4000) return { ok: false, error: "sitelog.invalid" };
  const sourceMessageId = text("sourceMessageId") || undefined;
  return { ok: true, value: sourceMessageId ? { site, date, weather, headcount, work, delays, sourceMessageId } : { site, date, weather, headcount, work, delays } };
}

// Starting values for the form from a message; the person edits them before saving. Headcount stays 0, never guessed.
export function prefillSiteLog(m: { subject: string; body_text: string; received_at: string }): { site: string; date: string; work: string } {
  return { site: m.subject.trim().slice(0, 100), date: m.received_at.slice(0, 10), work: m.body_text.trim().slice(0, 4000) };
}

// The day shown: the asked-for site (else the newest log's site) and date (else today). Dates are plain YYYY-MM-DD strings.
export function pickDay<L extends { site: string; log_date: string }>(logs: L[], site: string | undefined, date: string | undefined, today: string): { site: string; date: string; log: L | undefined; sites: string[]; days: string[] } {
  const sites = [...new Set(logs.map((l) => l.site))].sort();
  const s = site ?? logs[0]?.site ?? "";
  const d = date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : today;
  return { site: s, date: d, log: logs.find((l) => l.site === s && l.log_date === d), sites, days: logs.filter((l) => l.site === s).map((l) => l.log_date) };
}

// The neighbouring date, for the day stepper.
export function stepDay(date: string, delta: number): string {
  const t = new Date(`${date}T00:00:00Z`);
  t.setUTCDate(t.getUTCDate() + delta);
  return t.toISOString().slice(0, 10);
}
