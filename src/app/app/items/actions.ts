"use server";

import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/auth/supabase";
import { bulkUpdateTasks, createManualItem, updateManualItem } from "@/data/live";
import { bulkFromForm } from "@/domain/bulk";
import { itemFromForm } from "@/domain/items";
import { STATUSES } from "@/domain/board";
import { planChange, type Change, type SendResult } from "@/lib/offline-queue";

// Row-level security decides who may write; a person who is not a project manager gets an error.
export async function saveItem(form: FormData): Promise<void> {
  const item = itemFromForm(form);
  const supabase = await supabaseServer();
  const id = String(form.get("id") ?? "");
  if (id) await updateManualItem(supabase, id, item);
  else await createManualItem(supabase, String(form.get("projectId")), item);
  revalidatePath("/app/items");
}

export async function bulkTasks(form: FormData): Promise<void> {
  const { ids, patch } = bulkFromForm(form);
  await bulkUpdateTasks(await supabaseServer(), ids, patch);
  revalidatePath("/app/items");
}

// Applies one change queued while offline. A stale status is skipped and reported as a conflict; the note is still added.
export async function syncTaskChange(c: Change): Promise<SendResult> {
  if (c.status !== undefined && !STATUSES.some((s) => s === c.status)) throw new Error("unknown status");
  if ((c.note?.length ?? 0) > 2000) throw new Error("note too long");
  const supabase = await supabaseServer();
  const { data: current, error } = await supabase.from("tasks").select("status, details").eq("id", c.taskId).single();
  if (error || !current) throw new Error("task not found or not allowed");
  const { patch, conflict } = planChange(current, c);
  if (Object.keys(patch).length) {
    const { data, error: e } = await supabase.from("tasks").update(patch).eq("id", c.taskId).select("id");
    if (e || !data?.length) throw new Error("task not found or not allowed");
    revalidatePath("/app/items");
  }
  return conflict ? "conflict" : "ok";
}
