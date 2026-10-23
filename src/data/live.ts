import type { SupabaseClient } from "@supabase/supabase-js";
import { dayEnd, dayStart, type Filters } from "@/domain/filters";
import { MANUAL_KINDS, TABLE, toColumns, type ItemInput, type ManualKind } from "@/domain/items";
import type { AuditRow } from "@/domain/audit";
import { STATUSES, type BoardTask, type TaskStatus } from "@/domain/board";
import { ITEM_KINDS, ITEM_TABLE, isValidDraft, type ItemDraft, type LinkedItem } from "@/domain/linking";
import { PAGE_SIZE, afterFilter, decodeCursor, toPage, type Page } from "@/domain/paging";
import type { StoredSuggestion } from "@/domain/triage";
import { fromRow, type MessageRow, type TimelineMessage } from "@/domain/timeline";

type TaskRow = {
  id: string;
  title: string;
  status: TaskStatus;
  due_date: string | null;
  priority: BoardTask["priority"];
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
    priority: row.priority,
    position: row.position,
  };
}

// Row-level security limits every read and write here to the signed-in person's projects.
export async function listBoardTasks(client: SupabaseClient, projectId: string): Promise<BoardTask[]> {
  const { data, error } = await client
    .from("tasks")
    .select("id, title, status, due_date, priority, position, phases(name), profiles:owner_id(display_name)")
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

export async function listTimelineMessages(client: SupabaseClient, projectId: string, after?: string, f: Filters = {}): Promise<Page<TimelineMessage>> {
  const cursor = decodeCursor(after);
  let q = client
    .from("messages")
    .select("id, source, from_name, from_address, subject, body_text, received_at, message_attachments(id, part_index, filename, content_type, size_bytes)")
    .eq("project_id", projectId);
  // Characters that mean something in a PostgREST filter are removed from the typed text.
  const sender = f.sender?.replace(/[%_,()"\\]/g, "");
  if (sender) q = q.or(`from_address.ilike.%${sender}%,from_name.ilike.%${sender}%`);
  if (f.from) q = q.gte("received_at", dayStart(f.from));
  if (f.to) q = q.lt("received_at", dayEnd(f.to));
  if (f.kind) {
    const { data: links, error: e } = await client.from(ITEM_TABLE[f.kind]).select("source_message_id").eq("project_id", projectId).not("source_message_id", "is", null);
    if (e) throw e;
    q = q.in("id", (links ?? []).map((r) => r.source_message_id));
  }
  if (cursor) q = q.or(afterFilter("received_at", cursor));
  const { data, error } = await q.order("received_at", { ascending: false }).order("id", { ascending: false }).limit(PAGE_SIZE + 1);
  if (error) throw error;
  return toPage(((data ?? []) as unknown as MessageRow[]).map(fromRow), (m) => ({ at: m.receivedAt, id: m.id }));
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
export async function listLinkedItems(client: SupabaseClient, projectId: string, messageIds: string[]): Promise<LinkedItem[]> {
  if (!messageIds.length) return [];
  const found = await Promise.all(
    ITEM_KINDS.map(async (kind) => {
      const { data, error } = await client.from(ITEM_TABLE[kind]).select("id, title, source_message_id").eq("project_id", projectId).in("source_message_id", messageIds);
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

export type ManualItem = { id: string; kind: ManualKind; title: string; details: string; status: string; priority: string; startDate: string | null; dueDate: string | null; costCode: string; createdAt: string };

// Tasks, decisions and risks of a project for the edit screen, newest first.
export async function listManualItems(client: SupabaseClient, projectId: string, after?: string): Promise<Page<ManualItem>> {
  const cursor = decodeCursor(after);
  const found = await Promise.all(
    MANUAL_KINDS.map(async (kind) => {
      const cols = kind === "task" ? "id, title, details, status, priority, start_date, due_date, cost_code, created_at" : kind === "risk" ? "id, title, details, status, created_at" : "id, title, details, created_at";
      let q = client.from(TABLE[kind]).select(cols).eq("project_id", projectId);
      if (cursor) q = q.or(afterFilter("created_at", cursor));
      const { data, error } = await q.order("created_at", { ascending: false }).order("id", { ascending: false }).limit(PAGE_SIZE + 1);
      if (error) throw error;
      return ((data ?? []) as unknown as Record<string, string | null>[]).map((r) => ({
        id: r.id as string, kind, title: r.title as string, details: r.details ?? "", status: r.status ?? "", priority: r.priority ?? "", startDate: r.start_date ?? null, dueDate: r.due_date ?? null, costCode: r.cost_code ?? "", createdAt: r.created_at as string,
      }));
    }),
  );
  const merged = found.flat().sort((a, b) => (a.createdAt === b.createdAt ? (a.id < b.id ? 1 : -1) : a.createdAt < b.createdAt ? 1 : -1));
  return toPage(merged, (i) => ({ at: i.createdAt, id: i.id }));
}

export async function createManualItem(client: SupabaseClient, projectId: string, item: ItemInput): Promise<void> {
  const { error } = await client.from(TABLE[item.kind]).insert({ project_id: projectId, ...toColumns(item) });
  if (error) throw error;
}

export async function updateManualItem(client: SupabaseClient, id: string, item: ItemInput): Promise<void> {
  const { data, error } = await client.from(TABLE[item.kind]).update(toColumns(item)).eq("id", id).select("id");
  if (error) throw error;
  if (!data?.length) throw new Error("item not found or not allowed");
}

export async function listAudit(client: SupabaseClient, projectId: string): Promise<AuditRow[]> {
  const { data, error } = await client
    .from("audit_log")
    .select("created_at, project_id, actor_id, action, entity_type, entity_id, source_message_id")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false })
    .limit(5000);
  if (error) throw error;
  return data ?? [];
}

// One page of the log for the screen; the CSV download keeps using listAudit.
export async function listAuditPage(client: SupabaseClient, projectId: string, after?: string): Promise<Page<AuditRow & { id: number }>> {
  const cursor = decodeCursor(after);
  let q = client.from("audit_log").select("id, created_at, project_id, actor_id, action, entity_type, entity_id, source_message_id").eq("project_id", projectId);
  if (cursor) q = q.or(afterFilter("created_at", cursor));
  const { data, error } = await q.order("created_at", { ascending: false }).order("id", { ascending: false }).limit(PAGE_SIZE + 1);
  if (error) throw error;
  return toPage(data ?? [], (r) => ({ at: r.created_at, id: String(r.id) }));
}
