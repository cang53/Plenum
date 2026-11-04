import type { SupabaseClient } from "@supabase/supabase-js";

export type RiskRow = {
  id: string; kind: "risk" | "issue"; title: string; details: string; status: "open" | "closed";
  likelihood: number; severity: number; ownerId: string | null; dueDate: string | null; sourceMessageId: string | null; createdAt: string;
};
const COLS = "id, kind, title, details, status, likelihood, severity, owner_id, due_date, source_message_id, created_at";
type Raw = Record<string, unknown>;
const map = (r: Raw): RiskRow => ({
  id: r.id as string, kind: r.kind as RiskRow["kind"], title: r.title as string, details: (r.details as string) ?? "", status: r.status as RiskRow["status"],
  likelihood: r.likelihood as number, severity: r.severity as number, ownerId: (r.owner_id as string) ?? null, dueDate: (r.due_date as string) ?? null,
  sourceMessageId: (r.source_message_id as string) ?? null, createdAt: r.created_at as string,
});

export async function listRisks(client: SupabaseClient, projectId: string): Promise<RiskRow[]> {
  const { data, error } = await client.from("risks").select(COLS).eq("project_id", projectId).order("created_at", { ascending: false }).limit(200);
  if (error) throw error;
  return (data ?? []).map(map);
}

export async function getRisk(client: SupabaseClient, id: string): Promise<RiskRow | null> {
  const { data, error } = await client.from("risks").select(COLS).eq("id", id).maybeSingle();
  if (error) throw error;
  return data ? map(data) : null;
}

export async function createRisk(client: SupabaseClient, projectId: string, r: Pick<RiskRow, "kind" | "title" | "likelihood" | "severity">): Promise<string> {
  const { data, error } = await client.from("risks").insert({ project_id: projectId, ...r }).select("id").single();
  if (error) throw error;
  return data.id as string;
}

// Row-level security decides who may; no row back means not allowed.
export async function updateRisk(client: SupabaseClient, id: string, patch: Partial<Pick<RiskRow, "kind" | "title" | "details" | "status" | "likelihood" | "severity" | "ownerId" | "dueDate">>): Promise<void> {
  const { ownerId, dueDate, ...rest } = patch;
  const row: Raw = { ...rest };
  if (ownerId !== undefined) row.owner_id = ownerId;
  if (dueDate !== undefined) row.due_date = dueDate;
  const { data, error } = await client.from("risks").update(row).eq("id", id).select("id");
  if (error) throw error;
  if (!data?.length) throw new Error("risk not found or not allowed");
}
