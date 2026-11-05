"use server";

import { randomBytes } from "node:crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/auth/supabase";
import { checkName, slugFrom } from "@/domain/settings";

// Row-level security lets only workspace staff insert; the database adds the creator as manager.
export async function createProject(form: FormData): Promise<void> {
  const name = checkName(String(form.get("name") ?? ""));
  const workspaceId = String(form.get("workspaceId") ?? "");
  const parentId = String(form.get("parentId") ?? "") || null;
  if (!name.ok || !workspaceId) redirect("/app/projects?error=1");
  const supabase = await supabaseServer();
  const { data: user } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("projects")
    .insert({ workspace_id: workspaceId, name: name.value, parent_id: parentId, email_slug: slugFrom(name.value, randomBytes(2).toString("hex")), created_by: user.user?.id })
    .select("id")
    .single();
  if (error || !data) redirect("/app/projects?error=1");
  redirect(`/app?project=${data.id}`);
}

// Staff only, enforced by row-level security.
export async function createParent(form: FormData): Promise<void> {
  const name = checkName(String(form.get("name") ?? ""));
  const workspaceId = String(form.get("workspaceId") ?? "");
  if (!name.ok || !workspaceId) redirect("/app/projects?error=1");
  const supabase = await supabaseServer();
  const { error } = await supabase.from("project_parents").insert({ workspace_id: workspaceId, name: name.value });
  if (error) redirect("/app/projects?error=1");
  revalidatePath("/app/projects");
}

export async function renameParent(form: FormData): Promise<void> {
  const name = checkName(String(form.get("name") ?? ""));
  const id = String(form.get("id") ?? "");
  if (!name.ok || !id) redirect("/app/projects?error=1");
  const supabase = await supabaseServer();
  const { error } = await supabase.from("project_parents").update({ name: name.value }).eq("id", id);
  if (error) redirect("/app/projects?error=1");
  revalidatePath("/app/projects");
}

// Project managers only (row-level security); the database refuses a parent from another workspace.
export async function moveProject(projectId: string, parentId: string | null): Promise<boolean> {
  const supabase = await supabaseServer();
  const { error } = await supabase.from("projects").update({ parent_id: parentId || null }).eq("id", projectId);
  revalidatePath("/app/projects");
  return !error;
}
