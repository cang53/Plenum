"use server";

import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/auth/supabase";
import { createManualItem, updateManualItem } from "@/data/live";
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
