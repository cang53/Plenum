"use server";

import { supabaseServer } from "@/auth/supabase";
import { saveBaseline, setTaskDates } from "@/data/live";

export async function saveTaskDates(taskId: string, startDate: string, dueDate: string): Promise<void> {
  await setTaskDates(await supabaseServer(), taskId, startDate, dueDate);
}

export async function saveProjectBaseline(projectId: string): Promise<void> {
  await saveBaseline(await supabaseServer(), projectId);
}
