"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { supabaseServer } from "@/auth/supabase";
import { emailSender } from "@/server/email-config";
import { inviteEmail, inviteExpiry, inviteFromForm, ROLES } from "@/domain/invitations";
import type { ProjectRole } from "@/domain/permissions";

// Row-level security decides who may invite, change roles or remove people.
export async function invite(form: FormData): Promise<void> {
  const { email, role } = inviteFromForm(form);
  const projectId = String(form.get("projectId"));
  const supabase = await supabaseServer();
  const { data: project } = await supabase.from("projects").select("name, workspace_id").eq("id", projectId).single();
  if (!project) throw new Error("project not found");
  const { error } = await supabase.from("invitations").insert({ project_id: projectId, email, role });
  if (error) throw error;
  const origin = (await headers()).get("origin") ?? "";
  await emailSender().send({
    workspaceId: project.workspace_id,
    projectId,
    to: [email],
    ...inviteEmail(project.name, role, `${origin}/login`),
  });
  revalidatePath("/app/members");
}

export async function resend(form: FormData): Promise<void> {
  const supabase = await supabaseServer();
  const { data, error } = await supabase
    .from("invitations").update({ expires_at: inviteExpiry() })
    .eq("id", String(form.get("id"))).select("email, role, project_id, projects(name, workspace_id)");
  if (error) throw error;
  const inv = data?.[0] as unknown as { email: string; role: string; project_id: string; projects: { name: string; workspace_id: string } } | undefined;
  if (!inv) throw new Error("not allowed");
  const origin = (await headers()).get("origin") ?? "";
  await emailSender().send({
    workspaceId: inv.projects.workspace_id,
    projectId: inv.project_id,
    to: [inv.email],
    ...inviteEmail(inv.projects.name, inv.role, `${origin}/login`),
  });
  revalidatePath("/app/members");
}

export async function withdraw(form: FormData): Promise<void> {
  const { error } = await (await supabaseServer()).from("invitations").delete().eq("id", String(form.get("id")));
  if (error) throw error;
  revalidatePath("/app/members");
}

export async function changeRole(form: FormData): Promise<void> {
  const role = String(form.get("role")) as ProjectRole;
  if (!ROLES.includes(role)) throw new Error("Unknown role");
  const { data, error } = await (await supabaseServer())
    .from("project_members").update({ role })
    .eq("project_id", String(form.get("projectId"))).eq("user_id", String(form.get("userId"))).select("user_id");
  if (error) throw error;
  if (!data?.length) throw new Error("not allowed");
  revalidatePath("/app/members");
}

export async function removeMember(form: FormData): Promise<void> {
  const { data, error } = await (await supabaseServer())
    .from("project_members").delete()
    .eq("project_id", String(form.get("projectId"))).eq("user_id", String(form.get("userId"))).select("user_id");
  if (error) throw error;
  if (!data?.length) throw new Error("not allowed");
  revalidatePath("/app/members");
}
