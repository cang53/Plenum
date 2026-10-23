"use server";

import { supabaseServer } from "@/auth/supabase";
import { addBoardTask, setTaskStatus } from "@/data/live";

export async function saveTaskStatus(taskId: string, status: string): Promise<void> {
  await setTaskStatus(await supabaseServer(), taskId, status);
}

export async function createBoardTask(projectId: string, title: string, status: string) {
  return addBoardTask(await supabaseServer(), projectId, title, status);
}
