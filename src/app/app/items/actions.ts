"use server";

import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/auth/supabase";
import { bulkUpdateTasks, createManualItem, updateManualItem } from "@/data/live";
import { bulkFromForm } from "@/domain/bulk";
import { itemFromForm } from "@/domain/items";

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
