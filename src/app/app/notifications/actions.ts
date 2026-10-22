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

// Each person sets their own digest (on or off, and which parts); the profile rule limits this to their own row.
export async function saveDigest(form: FormData): Promise<void> {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");
  const { error } = await supabase.from("profiles").update({ digest_daily: form.get("digest") === "on", digest_suggestions: form.get("suggestions") === "on", digest_due: form.get("due") === "on" }).eq("id", user.id);
  if (error) throw error;
  revalidatePath("/app", "layout");
}
