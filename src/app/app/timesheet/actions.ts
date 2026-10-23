"use server";

import { redirect } from "next/navigation";
import { supabaseServer } from "@/auth/supabase";
import { saveHours, submitTimesheetWeek } from "@/data/live";
import { checkGrid, weekStart } from "@/domain/timesheet";

// The database keeps each person to their own hours and removes an entry when it is set to 0.
async function save(form: FormData, submit: boolean): Promise<void> {
  const projectId = String(form.get("projectId"));
  const week = weekStart(String(form.get("week")));
  const grid = checkGrid(form);
  let result = grid.ok ? (submit ? "submitted=1" : "saved=1") : `error=${grid.error}`;
  if (grid.ok) {
    try {
      const client = await supabaseServer();
      for (const e of grid.value) await saveHours(client, e);
      if (submit) {
        const { data } = await client.auth.getUser();
        if (!data.user) throw new Error("not signed in");
        await submitTimesheetWeek(client, projectId, data.user.id, week);
      }
    } catch {
      result = submit ? "error=hours.submitError" : "error=hours.saveError";
    }
  }
  redirect(`/app/timesheet?project=${projectId}&week=${week}&${result}`);
}

export async function submitHours(form: FormData): Promise<void> {
  return save(form, false);
}

export async function submitHoursWeek(form: FormData): Promise<void> {
  return save(form, true);
}
