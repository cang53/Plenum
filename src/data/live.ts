import type { SupabaseClient } from "@supabase/supabase-js";
import { STATUSES, type BoardTask, type TaskStatus } from "@/domain/board";
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
