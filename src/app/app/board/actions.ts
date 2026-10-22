"use server";

import { supabaseServer } from "@/auth/supabase";
import { setTaskStatus } from "@/data/live";

export async function saveTaskStatus(taskId: string, status: string): Promise<void> {
  await setTaskStatus(await supabaseServer(), taskId, status);
}
