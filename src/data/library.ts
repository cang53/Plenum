import type { SupabaseClient } from "@supabase/supabase-js";

export type LibraryDoc = { id: string; title: string; bodyText: string; filename: string | null; contentType: string | null; sizeBytes: number | null; storagePath: string | null; folderPath: string; createdAt: string };
const COLS = "id, title, body_text, filename, content_type, size_bytes, storage_path, folder_path, created_at";
const map = (r: Record<string, unknown>): LibraryDoc => ({ id: r.id as string, title: r.title as string, bodyText: (r.body_text as string) ?? "", filename: (r.filename as string) ?? null, contentType: (r.content_type as string) ?? null, sizeBytes: (r.size_bytes as number) ?? null, storagePath: (r.storage_path as string) ?? null, folderPath: (r.folder_path as string) ?? "", createdAt: r.created_at as string });

// The shared "lessons learned" folder of a workspace. Row-level security limits it to the workspace's staff.
export async function listLessons(client: SupabaseClient, workspaceId: string): Promise<LibraryDoc[]> {
  const { data, error } = await client.from("library_documents").select(COLS).eq("workspace_id", workspaceId).eq("folder", "lessons").order("created_at", { ascending: false }).limit(200);
  if (error) throw error;
  return (data ?? []).map(map);
}

// All documents of a project's folders (every level), newest first.
export async function listProjectDocs(client: SupabaseClient, projectId: string): Promise<LibraryDoc[]> {
  const { data, error } = await client.from("library_documents").select(COLS).eq("project_id", projectId).eq("folder", "project").order("created_at", { ascending: false }).limit(500);
  if (error) throw error;
  return (data ?? []).map(map);
}

export async function listFolderPaths(client: SupabaseClient, projectId: string): Promise<string[]> {
  const { data, error } = await client.from("library_folders").select("path").eq("project_id", projectId).limit(500);
  if (error) throw error;
  return (data ?? []).map((r) => r.path as string);
}

export async function createFolder(client: SupabaseClient, projectId: string, path: string): Promise<void> {
  const { error } = await client.from("library_folders").insert({ project_id: projectId, path });
  if (error && error.code !== "23505") throw error;
}

export type NewDoc = { id: string; workspaceId: string; projectId: string | null; folderPath: string; title: string; bodyText: string; filename: string | null; contentType: string | null; sizeBytes: number | null; storagePath: string | null };
export async function addDoc(client: SupabaseClient, d: NewDoc): Promise<void> {
  const { error } = await client.from("library_documents").insert({ id: d.id, workspace_id: d.workspaceId, project_id: d.projectId, folder: d.projectId ? "project" : "lessons", folder_path: d.folderPath, title: d.title, body_text: d.bodyText, filename: d.filename, content_type: d.contentType, size_bytes: d.sizeBytes, storage_path: d.storagePath });
  if (error) throw error;
}

export async function getDoc(client: SupabaseClient, id: string): Promise<LibraryDoc | null> {
  const { data, error } = await client.from("library_documents").select(COLS).eq("id", id).maybeSingle();
  if (error) throw error;
  return data ? map(data) : null;
}

export async function removeDoc(client: SupabaseClient, id: string): Promise<void> {
  const { data, error } = await client.from("library_documents").delete().eq("id", id).select("id, storage_path");
  if (error) throw error;
  if (!data?.length) throw new Error("document not found or not allowed");
  const path = data[0].storage_path as string | null;
  if (path) await client.storage.from("library").remove([path]);
}

export type StreamFile = { id: string; filename: string; contentType: string; sizeBytes: number; storagePath: string; subject: string; from: string; sentAt: string };
// Files people attached to messages written in Plenum, newest first. Email attachments are not listed: they stay in the raw email.
export async function listStreamFiles(client: SupabaseClient, projectId: string): Promise<StreamFile[]> {
  const { data, error } = await client.from("message_attachments").select("id, filename, content_type, size_bytes, storage_path, messages!inner(project_id, subject, from_name, from_address, sent_at, received_at)").eq("messages.project_id", projectId).not("storage_path", "is", null).limit(300);
  if (error) throw error;
  type Row = { id: string; filename: string; content_type: string; size_bytes: number; storage_path: string; messages: { subject: string; from_name: string | null; from_address: string; sent_at: string | null; received_at: string } };
  return ((data ?? []) as unknown as Row[]).map((r) => ({ id: r.id, filename: r.filename, contentType: r.content_type, sizeBytes: r.size_bytes, storagePath: r.storage_path, subject: r.messages.subject, from: r.messages.from_name || r.messages.from_address, sentAt: r.messages.sent_at ?? r.messages.received_at })).sort((a, b) => b.sentAt.localeCompare(a.sentAt));
}
