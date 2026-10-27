"use server";

import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/auth/supabase";
import { acceptSuggestion, dismissSuggestion } from "@/data/live";
import { teamsPoster } from "@/server/teams";
import { logError } from "@/lib/log";
import { checkFiles, safeName } from "@/domain/attachments";
import type { ItemKind } from "@/domain/linking";

// Row-level security decides who may write; the database checks the message belongs to the project.
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

// Apply and Edit both end here: the person's click, with the title and details as shown, goes to the existing accept call.
export async function applySuggestion(form: FormData): Promise<void> {
  await acceptSuggestion(await supabaseServer(), String(form.get("id")), {
    kind: String(form.get("kind")) as ItemKind,
    title: String(form.get("title") ?? ""),
    details: String(form.get("details") ?? ""),
  });
  revalidatePath("/app/stream");
}

export async function dismissSuggestionForm(form: FormData): Promise<void> {
  await dismissSuggestion(await supabaseServer(), String(form.get("id")));
  revalidatePath("/app/stream");
}

// Writes into the project's stream as the signed-in person; the subject is the conversation. The database function checks access.
// p_allow_empty is sent only with files, so plain messages still work before migration 151 is applied.
// Files go to the private bucket under <project>/<message>/ and are recorded on the message by a second database function.
export async function postMessage(form: FormData): Promise<void> {
  const body = String(form.get("body") ?? "").trim();
  const files = form.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);
  if (!body && files.length === 0) return;
  if (checkFiles(files)) throw new Error(checkFiles(files)!);
  const supabase = await supabaseServer();
  const projectId = String(form.get("projectId"));
  const { data: id, error } = await supabase.rpc("post_message", { p_project: projectId, p_body: body, p_subject: String(form.get("subject") ?? ""), ...(files.length ? { p_allow_empty: true } : {}) });
  if (error) throw error;
  // Best effort: a Teams outage must not lose a message that is already saved.
  if (process.env.TEAMS_PROVIDER === "live") {
    const { data: p } = await supabase.from("projects").select("email_slug").eq("id", projectId).single();
    if (p && body) await teamsPoster().post({ projectSlug: p.email_slug, kind: "message", text: body }).catch((e) => logError("teams post failed", e));
  }
  for (const f of files) {
    const path = `${projectId}/${id}/${crypto.randomUUID()}-${safeName(f.name)}`;
    const up = await supabase.storage.from("message-files").upload(path, f, { contentType: f.type });
    if (up.error) throw up.error;
    const { error: e } = await supabase.rpc("add_message_file", { p_message: id, p_path: path, p_filename: f.name, p_type: f.type, p_size: f.size });
    if (e) throw e;
  }
  revalidatePath("/app/stream");
}
