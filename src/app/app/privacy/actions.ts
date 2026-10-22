"use server";

import { redirect } from "next/navigation";
import { supabaseServer } from "@/auth/supabase";
import { parseRetention } from "@/domain/retention";

// Row-level security lets only workspace admins update the workspace.
export async function saveRetention(form: FormData): Promise<void> {
  const projectId = String(form.get("projectId"));
  const back = (r: string): never => redirect(`/app/privacy?project=${projectId}&${r}`);
  const parsed = parseRetention(String(form.get("days") ?? ""));
  if (!parsed.ok) back("error=privacy.invalid");
  const supabase = await supabaseServer();
  const { data: p } = await supabase.from("projects").select("workspace_id").eq("id", projectId).single();
  const { data, error } = await supabase.from("workspaces")
    .update({ retention_days: parsed.ok ? parsed.days : null }).eq("id", p?.workspace_id ?? "").select("id");
  if (error || !data?.length) back("error=settings.saveError");
  back("saved=1");
}
