"use server";

import { supabaseServer } from "@/auth/supabase";
import { revalidatePath } from "next/cache";
import { createGroup, saveBaseline, setTaskDates } from "@/data/live";

export async function saveTaskDates(taskId: string, startDate: string, dueDate: string): Promise<void> {
  await setTaskDates(await supabaseServer(), taskId, startDate, dueDate);
}

export async function saveProjectBaseline(projectId: string, name: string): Promise<void> {
  await saveBaseline(await supabaseServer(), projectId, name);
}

export async function addGroup(projectId: string, name: string, parentId: string | null): Promise<void> {
  if (!name.trim()) throw new Error("name is required");
  await createGroup(await supabaseServer(), projectId, name, parentId);
  revalidatePath("/app/gantt");
}
