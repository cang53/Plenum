import type { SupabaseClient } from "@supabase/supabase-js";
import { cleanDoc, type TlDoc } from "@/domain/tlDoc";

export type TimelineRow = { id: string; projectId: string; title: string; doc: TlDoc; createdAt: string; updatedAt: string; author: string; editor: string };
const COLS = "id, project_id, title, doc, created_at, updated_at, author:created_by(display_name), editor:updated_by(display_name)";
type Raw = { id: string; project_id: string; title: string; doc: unknown; created_at: string; updated_at: string; author: { display_name: string } | null; editor: { display_name: string } | null };
const map = (r: Raw): TimelineRow => ({ id: r.id, projectId: r.project_id, title: r.title, doc: cleanDoc(r.doc, r.title), createdAt: r.created_at, updatedAt: r.updated_at, author: r.author?.display_name ?? "", editor: r.editor?.display_name ?? r.author?.display_name ?? "" });

// Row-level security shows only the projects the person belongs to.
export async function listTimelines(client: SupabaseClient, projectId: string): Promise<TimelineRow[]> {
  const { data, error } = await client.from("timelines").select(COLS).eq("project_id", projectId).order("updated_at", { ascending: false }).limit(200);
  if (error) throw error;
  return ((data ?? []) as unknown as Raw[]).map(map);
}

export async function getTimeline(client: SupabaseClient, id: string): Promise<TimelineRow | null> {
  const { data, error } = await client.from("timelines").select(COLS).eq("id", id).maybeSingle();
  if (error) throw error;
  return data ? map(data as unknown as Raw) : null;
}

export async function createTimeline(client: SupabaseClient, projectId: string, title: string, doc: TlDoc): Promise<string> {
  const { data, error } = await client.from("timelines").insert({ project_id: projectId, title, doc }).select("id").single();
  if (error) throw error;
  return data.id as string;
}

export async function saveTimeline(client: SupabaseClient, id: string, title: string, doc: TlDoc): Promise<string> {
  const { data, error } = await client.from("timelines").update({ title, doc }).eq("id", id).select("updated_at").single();
  if (error) throw error;
  return data.updated_at as string;
}

export async function deleteTimeline(client: SupabaseClient, id: string): Promise<void> {
  const { error } = await client.from("timelines").delete().eq("id", id);
  if (error) throw error;
}
