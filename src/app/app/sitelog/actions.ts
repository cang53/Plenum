"use server";

import { redirect } from "next/navigation";
import { supabaseServer } from "@/auth/supabase";
import { saveSiteLog } from "@/data/live";
import { checkSiteLog } from "@/domain/siteLog";

// The database lets only members and managers write, and audits the save.
export async function submitSiteLog(form: FormData): Promise<void> {
  const projectId = String(form.get("projectId"));
  const input = checkSiteLog(form);
  let result = input.ok ? "saved=1" : `error=${input.error}`;
  if (input.ok) {
    try {
      await saveSiteLog(await supabaseServer(), projectId, input.value);
    } catch {
      result = "error=sitelog.saveError";
    }
  }
  redirect(`/app/sitelog?project=${projectId}&${result}`);
}
