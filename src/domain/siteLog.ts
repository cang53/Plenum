import type { Checked } from "./settings";

export type SiteLogInput = { site: string; date: string; weather: string; headcount: number; work: string; delays: string };

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
  return { ok: true, value: { site, date, weather, headcount, work, delays } };
}
