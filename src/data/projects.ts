import type { SupabaseClient } from "@supabase/supabase-js";

export type Project = { id: string; name: string; email_slug: string };

// Row-level security limits this to projects the signed-in person belongs to.
export async function listProjects(client: SupabaseClient): Promise<Project[]> {
  const { data, error } = await client
    .from("projects")
    .select("id, name, email_slug")
    .is("archived_at", null)
    .order("name");
  if (error) throw error;
  return data ?? [];
}

// The chosen project if the person belongs to it, otherwise the first one.
export function currentProject(projects: Project[], chosenId?: string | null): Project | undefined {
  return projects.find((p) => p.id === chosenId) ?? projects[0];
}

export type Member = { userId: string; role: string; name: string; email: string };
export type Invitation = { id: string; email: string; role: string; expiresAt: string };

export async function listMembers(client: SupabaseClient, projectId: string): Promise<Member[]> {
  const { data, error } = await client
    .from("project_members")
    .select("user_id, role, profiles(display_name, email)")
    .eq("project_id", projectId);
  if (error) throw error;
  type Row = { user_id: string; role: string; profiles: { display_name: string; email: string } | null };
  return ((data ?? []) as unknown as Row[]).map((r) => ({
    userId: r.user_id,
    role: r.role,
    name: r.profiles?.display_name ?? "",
    email: r.profiles?.email ?? "",
  }));
}

// Only project managers can read invitations; everyone else gets an empty list.
export async function listInvitations(client: SupabaseClient, projectId: string): Promise<Invitation[]> {
  const { data, error } = await client
    .from("invitations")
    .select("id, email, role, expires_at")
    .eq("project_id", projectId)
    .is("accepted_at", null)
    .order("created_at");
  if (error) throw error;
  return (data ?? []).map((i) => ({ id: i.id, email: i.email, role: i.role, expiresAt: i.expires_at }));
}
