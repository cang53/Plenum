"use server";

import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/auth/supabase";
import { checklistText } from "@/domain/taskDetail";

// The sheet shows this on Board and Items too, so the whole app is refreshed.
// Row-level security lets only a project manager or the task's owner change the checklist.
export async function addCheck(form: FormData): Promise<void> {
  const taskId = String(form.get("taskId"));
  const supabase = await supabaseServer();
  const { count } = await supabase.from("task_checklist").select("id", { count: "exact", head: true }).eq("task_id", taskId);
  const { error } = await supabase.from("task_checklist").insert({ task_id: taskId, text: checklistText(form.get("text")), position: count ?? 0 });
  if (error) throw error;
  revalidatePath("/app", "layout");
}

export async function toggleCheck(form: FormData): Promise<void> {
  const { data, error } = await (await supabaseServer()).from("task_checklist").update({ done: form.get("done") === "true" }).eq("id", String(form.get("id"))).select("id");
  if (error) throw error;
  if (!data?.length) throw new Error("item not found or not allowed");
  revalidatePath("/app", "layout");
}

export async function removeCheck(form: FormData): Promise<void> {
  const { error } = await (await supabaseServer()).from("task_checklist").delete().eq("id", String(form.get("id")));
  if (error) throw error;
  revalidatePath("/app", "layout");
}
