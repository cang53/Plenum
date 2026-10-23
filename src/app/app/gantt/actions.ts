"use server";

import { supabaseServer } from "@/auth/supabase";
import { setTaskDates } from "@/data/live";

export async function saveTaskDates(taskId: string, startDate: string, dueDate: string): Promise<void> {
  await setTaskDates(await supabaseServer(), taskId, startDate, dueDate);
}
