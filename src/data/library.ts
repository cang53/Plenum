import type { SupabaseClient } from "@supabase/supabase-js";

export type LibraryDoc = { id: string; title: string; bodyText: string; filename: string | null; sizeBytes: number | null; createdAt: string };
const COLS = "id, title, body_text, filename, size_bytes, created_at";
const map = (r: Record<string, unknown>): LibraryDoc => ({ id: r.id as string, title: r.title as string, bodyText: (r.body_text as string) ?? "", filename: (r.filename as string) ?? null, sizeBytes: (r.size_bytes as number) ?? null, createdAt: r.created_at as string });

// The shared "lessons learned" folder of a workspace. Row-level security limits it to the workspace's staff.
export async function listLessons(client: SupabaseClient, workspaceId: string): Promise<LibraryDoc[]> {
  const { data, error } = await client.from("library_documents").select(COLS).eq("workspace_id", workspaceId).eq("folder", "lessons").order("created_at", { ascending: false }).limit(200);
  if (error) throw error;
  return (data ?? []).map(map);
}

export async function addLesson(client: SupabaseClient, d: { id: string; workspaceId: string; title: string; bodyText: string; filename: string | null; contentType: string | null; sizeBytes: number | null; storagePath: string | null }): Promise<void> {
  const { error } = await client.from("library_documents").insert({ id: d.id, workspace_id: d.workspaceId, folder: "lessons", title: d.title, body_text: d.bodyText, filename: d.filename, content_type: d.contentType, size_bytes: d.sizeBytes, storage_path: d.storagePath });
  if (error) throw error;
}

export async function removeDoc(client: SupabaseClient, id: string): Promise<void> {
  const { data, error } = await client.from("library_documents").delete().eq("id", id).select("id, storage_path");
  if (error) throw error;
  if (!data?.length) throw new Error("document not found or not allowed");
  const path = data[0].storage_path as string | null;
  if (path) await client.storage.from("library").remove([path]);
}
