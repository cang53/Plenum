"use server";

import { redirect } from "next/navigation";
import { supabaseServer } from "@/auth/supabase";
import { saveSiteLog, submitSiteLog as submitLog } from "@/data/live";
import { checkSiteLog } from "@/domain/siteLog";
import type { LogEntry } from "@/lib/offline-queue";

// The database lets only members and managers write, and audits the save.
export async function submitSiteLog(form: FormData): Promise<void> {
  const projectId = String(form.get("projectId"));
  const input = checkSiteLog(form);
  let result = input.ok ? `saved=1&site=${encodeURIComponent(input.value.site)}&date=${input.value.date}` : `error=${input.error}`;
  if (input.ok) {
    try {
      await saveSiteLog(await supabaseServer(), projectId, input.value);
    } catch {
      result = "error=sitelog.saveError";
    }
  }
  redirect(`/app/sitelog?project=${projectId}&${result}`);
}

// Signs off the day; from then on it is locked.
export async function signOffSiteLog(form: FormData): Promise<void> {
  const projectId = String(form.get("projectId"));
  let result = "saved=1";
  try {
    await submitLog(await supabaseServer(), String(form.get("logId")));
  } catch {
    result = "error=sitelog.submitError";
  }
  redirect(`/app/sitelog?project=${projectId}&site=${encodeURIComponent(String(form.get("site")))}&date=${String(form.get("date"))}&${result}`);
}

// One entry written offline. Checked again here and by the database; a throw keeps it waiting on the device.
export async function syncSiteLog({ projectId, ...entry }: LogEntry): Promise<void> {
  const input = checkSiteLog({ get: (k) => (entry as Record<string, unknown>)[k]?.toString() });
  if (!input.ok) throw new Error(input.error);
  await saveSiteLog(await supabaseServer(), projectId, input.value);
}
