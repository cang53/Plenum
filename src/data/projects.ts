import type { SupabaseClient } from "@supabase/supabase-js";
import type { Notification } from "@/domain/notifications";
import { PAGE_SIZE, afterFilter, decodeCursor, toPage, type Page } from "@/domain/paging";

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
export async function listNotifications(client: SupabaseClient, projectId: string, after?: string): Promise<Page<Notification>> {
  const cursor = decodeCursor(after);
  let q = client.from("notifications").select("id, kind, subject, created_at, read_at").eq("project_id", projectId);
  if (cursor) q = q.or(afterFilter("created_at", cursor));
  const { data, error } = await q.order("created_at", { ascending: false }).order("id", { ascending: false }).limit(PAGE_SIZE + 1);
  if (error) throw error;
  return toPage(
    (data ?? []).map((n) => ({ id: n.id, kind: n.kind, subject: n.subject, createdAt: n.created_at, read: n.read_at !== null })),
    (n) => ({ at: n.createdAt, id: n.id }),
  );
}

export type SearchHit = { kind: "task" | "message" | "decision"; id: string; title: string; snippet: string };

export type SearchFilters = { since?: string; until?: string; task?: string };

// Row-level security limits this to what the signed-in person can see in the project.
// The cursor is the number of hits already shown; search has no timestamp to continue from.
export async function searchProject(client: SupabaseClient, projectId: string, q: string, after?: string, filters: SearchFilters = {}): Promise<Page<SearchHit>> {
  const offset = Math.max(0, Number.parseInt(after ?? "", 10) || 0);
  const { data, error } = await client.rpc("search_project", { p: projectId, q, skip: offset, since: filters.since || null, until: filters.until || null, task: filters.task || null });
  if (error) throw error;
  const hits: SearchHit[] = data ?? [];
  return { rows: hits.slice(0, PAGE_SIZE), next: hits.length > PAGE_SIZE ? String(offset + PAGE_SIZE) : null };
}
