import type { SupabaseClient } from "@supabase/supabase-js";

export type RiskRow = {
  id: string; kind: "risk" | "issue"; title: string; details: string; status: "open" | "closed"; remediation: "none" | "in_remediation" | "remediated"; linkedTaskId: string | null; linkDeclined: boolean;
  likelihood: number; severity: number; ownerId: string | null; dueDate: string | null; sourceMessageId: string | null; createdAt: string;
};
const COLS = "id, kind, title, details, status, remediation, linked_task_id, link_declined, likelihood, severity, owner_id, due_date, source_message_id, created_at";
type Raw = Record<string, unknown>;
const map = (r: Raw): RiskRow => ({
  id: r.id as string, kind: r.kind as RiskRow["kind"], title: r.title as string, details: (r.details as string) ?? "", status: r.status as RiskRow["status"], remediation: (r.remediation as RiskRow["remediation"]) ?? "none", linkedTaskId: (r.linked_task_id as string) ?? null, linkDeclined: Boolean(r.link_declined),
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

export async function createRisk(client: SupabaseClient, projectId: string, r: Pick<RiskRow, "kind" | "title" | "likelihood" | "severity"> & { details?: string }): Promise<string> {
  const { data, error } = await client.from("risks").insert({ project_id: projectId, ...r }).select("id").single();
  if (error) throw error;
  return data.id as string;
}

// Row-level security decides who may; no row back means not allowed.
export async function updateRisk(client: SupabaseClient, id: string, patch: Partial<Pick<RiskRow, "kind" | "title" | "details" | "status" | "remediation" | "linkedTaskId" | "linkDeclined" | "likelihood" | "severity" | "ownerId" | "dueDate">>): Promise<void> {
  const { ownerId, dueDate, linkedTaskId, linkDeclined, ...rest } = patch;
  const row: Raw = { ...rest };
  if (ownerId !== undefined) row.owner_id = ownerId;
  if (dueDate !== undefined) row.due_date = dueDate;
  if (linkedTaskId !== undefined) row.linked_task_id = linkedTaskId;
  if (linkDeclined !== undefined) row.link_declined = linkDeclined;
  const { data, error } = await client.from("risks").update(row).eq("id", id).select("id");
  if (error) throw error;
  if (!data?.length) throw new Error("risk not found or not allowed");
}

export type OtherRisk = RiskRow & { projectName: string };

// Earlier risks and issues in the other projects this person can see. Row-level security limits the rows.
export async function listOtherRisks(client: SupabaseClient, projectId: string): Promise<OtherRisk[]> {
  const { data, error } = await client.from("risks").select(`${COLS}, projects(name)`).neq("project_id", projectId).order("created_at", { ascending: false }).limit(300);
  if (error) throw error;
  return (data ?? []).map((r) => ({ ...map(r), projectName: ((r as unknown as { projects: { name: string } | null }).projects?.name) ?? "" }));
}
