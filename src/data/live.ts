import type { SupabaseClient } from "@supabase/supabase-js";
import { STATUSES, type BoardTask, type TaskStatus } from "@/domain/board";
import { ITEM_KINDS, ITEM_TABLE, isValidDraft, type ItemDraft, type LinkedItem } from "@/domain/linking";
import type { StoredSuggestion } from "@/domain/triage";
import { fromRow, type MessageRow, type TimelineMessage } from "@/domain/timeline";

type TaskRow = {
  id: string;
  title: string;
  status: TaskStatus;
  due_date: string | null;
  position: number;
  phases: { name: string } | null;
  profiles: { display_name: string } | null;
};

export function taskFromRow(row: TaskRow): BoardTask {
  return {
    id: row.id,
    title: row.title,
    status: row.status,
    phase: row.phases?.name ?? null,
    ownerName: row.profiles?.display_name ?? null,
    dueDate: row.due_date,
    position: row.position,
  };
}

// Row-level security limits every read and write here to the signed-in person's projects.
export async function listBoardTasks(client: SupabaseClient, projectId: string): Promise<BoardTask[]> {
  const { data, error } = await client
    .from("tasks")
    .select("id, title, status, due_date, position, phases(name), profiles:owner_id(display_name)")
    .eq("project_id", projectId)
    .is("parent_id", null);
  if (error) throw error;
  return ((data ?? []) as unknown as TaskRow[]).map(taskFromRow);
}

// The database trigger writes the audit entry for the change.
export async function setTaskStatus(client: SupabaseClient, taskId: string, status: string): Promise<void> {
  if (!STATUSES.includes(status as TaskStatus)) throw new Error("unknown status");
  const { data, error } = await client.from("tasks").update({ status }).eq("id", taskId).select("id");
  if (error) throw error;
  if (!data?.length) throw new Error("task not found or not allowed");
}

export async function listTimelineMessages(client: SupabaseClient, projectId: string): Promise<TimelineMessage[]> {
  const { data, error } = await client
    .from("messages")
    .select("id, source, from_name, from_address, subject, body_text, received_at, message_attachments(id, part_index, filename, content_type, size_bytes)")
    .eq("project_id", projectId)
    .order("received_at", { ascending: false });
  if (error) throw error;
  return ((data ?? []) as unknown as MessageRow[]).map(fromRow);
}

export async function listPendingSuggestions(client: SupabaseClient, projectId: string): Promise<StoredSuggestion[]> {
  const { data, error } = await client
    .from("suggestions")
    .select("id, message_id, kind, title, details, status")
    .eq("project_id", projectId)
    .eq("status", "pending");
  if (error) throw error;
  return (data ?? []).map((r) => ({ id: r.id, messageId: r.message_id, kind: r.kind, title: r.title, details: r.details, status: r.status }));
}

// Items already made from this project's messages, for the lines under each message.
export async function listLinkedItems(client: SupabaseClient, projectId: string): Promise<LinkedItem[]> {
  const found = await Promise.all(
    ITEM_KINDS.map(async (kind) => {
      const { data, error } = await client.from(ITEM_TABLE[kind]).select("id, title, source_message_id").eq("project_id", projectId).not("source_message_id", "is", null);
      if (error) throw error;
      return (data ?? []).map((r) => ({ id: r.id, kind, title: r.title, messageId: r.source_message_id }));
    }),
  );
  return found.flat();
}

// One database call makes the item (linked to the source message) and marks the suggestion accepted.
export async function acceptSuggestion(client: SupabaseClient, id: string, draft: ItemDraft): Promise<void> {
  if (!isValidDraft(draft)) throw new Error("title is required");
  const { error } = await client.rpc("accept_suggestion", {
    p_id: id,
    p_kind: draft.kind,
    p_title: draft.title.trim(),
    p_details: draft.details.trim(),
  });
  if (error) throw error;
}

export async function dismissSuggestion(client: SupabaseClient, id: string): Promise<void> {
  const { data, error } = await client.from("suggestions").update({ status: "dismissed" }).eq("id", id).eq("status", "pending").select("id");
  if (error) throw error;
  if (!data?.length) throw new Error("suggestion not found or not allowed");
}
