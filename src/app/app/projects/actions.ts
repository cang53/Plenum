"use server";

import { randomBytes } from "node:crypto";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/auth/supabase";
import { checkName, slugFrom } from "@/domain/settings";

// Row-level security lets only workspace staff insert; the database adds the creator as manager.
export async function createProject(form: FormData): Promise<void> {
  const name = checkName(String(form.get("name") ?? ""));
  const workspaceId = String(form.get("workspaceId") ?? "");
  if (!name.ok || !workspaceId) redirect("/app/projects?error=1");
  const supabase = await supabaseServer();
  const { data: user } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("projects")
    .insert({ workspace_id: workspaceId, name: name.value, email_slug: slugFrom(name.value, randomBytes(2).toString("hex")), created_by: user.user?.id })
    .select("id")
    .single();
  if (error || !data) redirect("/app/projects?error=1");
  redirect(`/app?project=${data.id}`);
}
