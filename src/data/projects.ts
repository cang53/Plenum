import type { SupabaseClient } from "@supabase/supabase-js";
import type { Notification } from "@/domain/notifications";

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

// Row-level security limits this to the signed-in person's own notifications in this project.
export async function listNotifications(client: SupabaseClient, projectId: string): Promise<Notification[]> {
  const { data, error } = await client
    .from("notifications")
    .select("id, kind, subject, created_at, read_at")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw error;
  return (data ?? []).map((n) => ({ id: n.id, kind: n.kind, subject: n.subject, createdAt: n.created_at, read: n.read_at !== null }));
}

export type SearchHit = { kind: "task" | "message" | "decision"; id: string; title: string; snippet: string };

// Row-level security limits this to what the signed-in person can see in the project.
export async function searchProject(client: SupabaseClient, projectId: string, q: string): Promise<SearchHit[]> {
  const { data, error } = await client.rpc("search_project", { p: projectId, q });
  if (error) throw error;
  return data ?? [];
}
