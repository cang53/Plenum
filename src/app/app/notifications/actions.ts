"use server";

import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/auth/supabase";

// Row-level security limits this to the person's own rows.
export async function markAllRead(form: FormData): Promise<void> {
  const supabase = await supabaseServer();
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("project_id", String(form.get("projectId")))
    .is("read_at", null);
  if (error) throw error;
  revalidatePath("/app", "layout");
}
