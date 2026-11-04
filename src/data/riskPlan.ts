import type { SupabaseClient } from "@supabase/supabase-js";
import type { PlacedStep } from "@/domain/riskPlan";

export type StepRow = { id: string; title: string; startDate: string | null; dueDate: string | null; ownerId: string | null; gapNote: string; reason: string; origin: "ai" | "manual"; status: "proposed" | "accepted" | "dismissed"; taskId: string | null };

export async function listSteps(client: SupabaseClient, riskId: string): Promise<StepRow[]> {
  const { data, error } = await client.from("risk_plan_steps").select("id, title, start_date, due_date, owner_id, gap_note, reason, origin, status, task_id").eq("risk_id", riskId).neq("status", "dismissed").order("start_date", { nullsFirst: false }).order("created_at");
  if (error) throw error;
  return (data ?? []).map((r) => ({ id: r.id, title: r.title, startDate: r.start_date, dueDate: r.due_date, ownerId: r.owner_id, gapNote: r.gap_note, reason: r.reason, origin: r.origin, status: r.status, taskId: r.task_id }));
}

// A new proposal replaces the earlier ones that nobody has accepted yet.
export async function saveProposedSteps(client: SupabaseClient, riskId: string, projectId: string, origin: "ai" | "manual", steps: PlacedStep[]): Promise<void> {
  const del = await client.from("risk_plan_steps").delete().eq("risk_id", riskId).eq("status", "proposed").eq("origin", origin);
  if (del.error) throw del.error;
  if (!steps.length) return;
  const { error } = await client.from("risk_plan_steps").insert(steps.map((s) => ({ risk_id: riskId, project_id: projectId, title: s.title, start_date: s.startDate, due_date: s.dueDate, owner_id: s.ownerId, gap_note: s.gapNote, reason: s.reason, origin })));
  if (error) throw error;
}

export async function resolveStep(client: SupabaseClient, id: string, accept: boolean): Promise<void> {
  if (accept) {
    const { error } = await client.rpc("accept_risk_step", { p_step: id });
    if (error) throw error;
    return;
  }
  const { data, error } = await client.from("risk_plan_steps").update({ status: "dismissed", resolved_by: null }).eq("id", id).eq("status", "proposed").select("id");
  if (error) throw error;
  if (!data?.length) throw new Error("step not found or not allowed");
}

export type StepInsert = { title: string; startDate: string; dueDate: string; ownerId: string | null; reason: string };

// Stores steps as proposals and returns their ids, replacing earlier proposals of the same origin.
export async function insertSteps(client: SupabaseClient, riskId: string, projectId: string, origin: "ai" | "manual", rows: StepInsert[]): Promise<string[]> {
  const del = await client.from("risk_plan_steps").delete().eq("risk_id", riskId).eq("status", "proposed").eq("origin", origin);
  if (del.error) throw del.error;
  if (!rows.length) return [];
  const { data, error } = await client.from("risk_plan_steps").insert(rows.map((r) => ({ risk_id: riskId, project_id: projectId, title: r.title, start_date: r.startDate, due_date: r.dueDate, owner_id: r.ownerId, reason: r.reason, origin }))).select("id");
  if (error) throw error;
  return (data ?? []).map((d) => d.id as string);
}
