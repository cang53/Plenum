import type { SupabaseClient } from "@supabase/supabase-js";

export type InboxItem = {
  id: string; messageId: string; kind: "task" | "decision" | "risk" | "change_request"; title: string; details: string;
  reason: string;
  status: "pending" | "accepted" | "dismissed"; resolvedBy: string; resolvedAt: string | null;
  subject: string; from: string; body: string; receivedAt: string;
};

const COLUMNS = "id, message_id, kind, title, details, reason, status, resolved_at, profiles:resolved_by(display_name), messages(subject, from_name, from_address, body_text, received_at)";

// Row-level security limits this to the project's suggestions; each comes with the message it is based on.
export async function listInbox(client: SupabaseClient, projectId: string, history: boolean): Promise<InboxItem[]> {
  const q = client.from("suggestions").select(COLUMNS).eq("project_id", projectId);
  const { data, error } = await (history ? q.neq("status", "pending").order("resolved_at", { ascending: false }) : q.eq("status", "pending").order("created_at", { ascending: false })).limit(50);
  if (error) throw error;
  return (data ?? []).map((r) => {
    const row = r as unknown as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
    return {
      id: row.id, messageId: row.message_id, kind: row.kind, title: row.title, details: row.details, reason: row.reason ?? "", status: row.status,
      resolvedBy: row.profiles?.display_name ?? "", resolvedAt: row.resolved_at,
      subject: row.messages?.subject ?? "", from: row.messages?.from_name || row.messages?.from_address || "", body: row.messages?.body_text ?? "", receivedAt: row.messages?.received_at ?? "",
    };
  });
}

// Only the signed-in person's own snoozes come back.
export async function listSnoozes(client: SupabaseClient): Promise<Map<string, string>> {
  const { data, error } = await client.from("suggestion_snoozes").select("suggestion_id, until");
  if (error) throw error;
  return new Map((data ?? []).map((s) => [s.suggestion_id as string, s.until as string]));
}
