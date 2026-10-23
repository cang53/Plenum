"use server";

import { redirect } from "next/navigation";
import { supabaseServer } from "@/auth/supabase";
import { saveHours } from "@/data/live";
import { checkGrid, weekStart } from "@/domain/timesheet";

// The database keeps each person to their own hours and removes an entry when it is set to 0.
export async function submitHours(form: FormData): Promise<void> {
  const projectId = String(form.get("projectId"));
  const week = weekStart(String(form.get("week")));
  const grid = checkGrid(form);
  let result = grid.ok ? "saved=1" : `error=${grid.error}`;
  if (grid.ok) {
    try {
      const client = await supabaseServer();
      for (const e of grid.value) await saveHours(client, e);
    } catch {
      result = "error=hours.saveError";
    }
  }
  redirect(`/app/timesheet?project=${projectId}&week=${week}&${result}`);
}
