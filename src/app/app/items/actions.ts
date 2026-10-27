"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/auth/supabase";
import { appendItemNote, currentItemText, saveHours, setTaskStatus, bulkUpdateTasks, createManualItem, deleteManualItem, setRiskStatus, updateManualItem } from "@/data/live";
import { bulkFromForm } from "@/domain/bulk";
import { itemFromForm, MANUAL_KINDS } from "@/domain/items";
import { STATUSES } from "@/domain/board";
import { itemVersion, type SaveResult } from "@/domain/saveState";
import { planChange, type Change, type SendResult } from "@/lib/offline-queue";

// Row-level security decides who may write; a person who is not a project manager gets an error.
export async function saveItem(_: SaveResult, form: FormData): Promise<SaveResult> {
  let item;
  try {
    item = itemFromForm(form);
  } catch (e) {
    return { status: "invalid", message: String(e).includes("due date") ? "items.err.dates" : "items.err.title" };
  }
  const id = String(form.get("id") ?? "");
  const back = String(form.get("back") ?? "/app/items");
  let savedId = id;
  try {
    const supabase = await supabaseServer();
    if (id) {
      const base = String(form.get("base") ?? "");
      const now = base ? await currentItemText(supabase, item.kind, id) : null;
      if (now && itemVersion(now) !== base) return { status: "conflict", latest: { title: now.title, details: now.details } };
      await updateManualItem(supabase, id, item);
    } else savedId = await createManualItem(supabase, String(form.get("projectId")), item);
  } catch {
    return { status: "error" };
  }
  revalidatePath("/app/items");
  redirect(`${/^\/(app|demo)\//.test(back) ? back : "/app/items"}${back.includes("?") ? "&" : "?"}saved=${item.kind}:${savedId}`);
}

const kindOf = (form: FormData) => {
  const kind = MANUAL_KINDS.find((k) => k === form.get("kind"));
  if (!kind) throw new Error("unknown kind");
  return kind;
};

// A task owner who may not edit the task can still update their own status, add a note and book hours.
export async function quickUpdate(form: FormData): Promise<void> {
  const client = await supabaseServer();
  const id = String(form.get("id"));
  const status = String(form.get("status") ?? "");
  const hours = Number(form.get("hours") || 0);
  const date = String(form.get("date") ?? "");
  if (!STATUSES.some((s) => s === status)) throw new Error("unknown status");
  if (!(hours >= 0 && hours <= 24)) throw new Error("hours must be between 0 and 24");
  if (hours > 0 && !/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error("date is required with hours");
  await setTaskStatus(client, id, status);
  const note = String(form.get("note") ?? "").trim();
  if (note) await appendItemNote(client, "task", id, note, new Date().toISOString().slice(0, 10));
  if (hours > 0) await saveHours(client, { taskId: id, date, hours });
  revalidatePath("/app/items");
}

export async function toggleRisk(form: FormData): Promise<void> {
  await setRiskStatus(await supabaseServer(), String(form.get("id")), form.get("to") === "closed" ? "closed" : "open");
  revalidatePath("/app/items");
}

export async function deleteItem(form: FormData): Promise<void> {
  await deleteManualItem(await supabaseServer(), kindOf(form), String(form.get("id")));
  revalidatePath("/app/items");
  redirect(String(form.get("back") ?? "/app/items").startsWith("/app/") ? String(form.get("back")) : "/app/items");
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
