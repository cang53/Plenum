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
