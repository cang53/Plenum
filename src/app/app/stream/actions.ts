"use server";

import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/auth/supabase";

// Row-level security decides who may write; the database checks the message belongs to the project.
export async function createTaskFromMessage(form: FormData): Promise<void> {
  const title = String(form.get("title") ?? "").trim();
  if (!title) throw new Error("title is required");
  const { error } = await (await supabaseServer()).from("tasks").insert({
    project_id: String(form.get("projectId")),
    source_message_id: String(form.get("messageId")),
    title,
  });
  if (error) throw error;
  revalidatePath("/app/stream");
}

// Only a task without a source can take one, so an existing source is never replaced.
export async function linkMessageToTask(form: FormData): Promise<void> {
  const { data, error } = await (await supabaseServer()).from("tasks")
    .update({ source_message_id: String(form.get("messageId")) })
    .eq("id", String(form.get("taskId"))).is("source_message_id", null).select("id");
  if (error) throw error;
  if (!data?.length) throw new Error("task not found or already has a source");
  revalidatePath("/app/stream");
}

// Row-level rules let only a project manager pin; the database records who and when.
export async function togglePin(form: FormData): Promise<void> {
  const supabase = await supabaseServer();
  const messageId = String(form.get("messageId"));
  const { error } = form.get("pinned") === "1"
    ? await supabase.from("message_pins").delete().eq("message_id", messageId)
    : await supabase.from("message_pins").insert({ message_id: messageId, project_id: String(form.get("projectId")) });
  if (error) throw error;
  revalidatePath("/app/stream");
}
