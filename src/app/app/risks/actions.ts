"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/auth/supabase";
import { listMembers } from "@/data/projects";
import { createRisk, getRisk, listOtherRisks, updateRisk } from "@/data/risks";
import { resolveStep, saveProposedSteps } from "@/data/riskPlan";
import { clampLevel } from "@/domain/risk";
import { buildPlanPrompt, fallbackPlan, parsePlan, placeOwners, PLAN_SYSTEM_PROMPT } from "@/domain/riskPlan";
import { findSimilar } from "@/domain/riskSimilar";
import { logError } from "@/lib/log";
import { serviceConfig } from "@/server/inbound-config";
import { aiAsk, supabaseTriageIo } from "@/server/triage-run";

const kindOf = (v: unknown) => (v === "issue" ? "issue" : "risk");

// Row-level security decides who may add or change risks and issues.
export async function addRisk(form: FormData): Promise<void> {
  const projectId = String(form.get("projectId"));
  const title = String(form.get("title") ?? "").trim().slice(0, 200);
  if (!title) throw new Error("title is required");
  const id = await createRisk(await supabaseServer(), projectId, { kind: kindOf(form.get("kind")), title, likelihood: clampLevel(form.get("likelihood")), severity: clampLevel(form.get("severity")) });
  redirect(`/app/risks/${id}?project=${projectId}`);
}

export async function saveRisk(form: FormData): Promise<void> {
  const id = String(form.get("id"));
  const title = String(form.get("title") ?? "").trim().slice(0, 200);
  if (!title) throw new Error("title is required");
  const owner = String(form.get("ownerId") ?? "");
  const due = String(form.get("dueDate") ?? "");
  await updateRisk(await supabaseServer(), id, {
    title, kind: kindOf(form.get("kind")), details: String(form.get("details") ?? "").slice(0, 4000),
    likelihood: clampLevel(form.get("likelihood")), severity: clampLevel(form.get("severity")),
    ownerId: owner || null, dueDate: /^\d{4}-\d{2}-\d{2}$/.test(due) ? due : null,
  });
  revalidatePath("/app/risks");
}

export async function toggleRiskStatus(form: FormData): Promise<void> {
  await updateRisk(await supabaseServer(), String(form.get("id")), { status: form.get("to") === "closed" ? "closed" : "open" });
  revalidatePath("/app/risks");
}

export async function proposePlan(form: FormData): Promise<void> {
  const riskId = String(form.get("id"));
  const supabase = await supabaseServer();
  const risk = await getRisk(supabase, riskId);
  if (!risk) throw new Error("risk not found");
  const { data: pr } = await supabase.from("risks").select("project_id").eq("id", riskId).single();
  const projectId = pr?.project_id as string;
  const today = new Date().toISOString().slice(0, 10);
  const [tasksRes, people, others] = await Promise.all([
    supabase.from("tasks").select("title, start_date, due_date, owner_id").eq("project_id", projectId).neq("status", "done").limit(300),
    listMembers(supabase, projectId),
    listOtherRisks(supabase, projectId),
  ]);
  if (tasksRes.error) throw tasksRes.error;
  const tasks = (tasksRes.data ?? []).map((t) => ({ title: t.title as string, startDate: t.start_date as string | null, dueDate: t.due_date as string | null, ownerId: t.owner_id as string | null }));
  const lessons = findSimilar(risk, others, 3).filter((s) => s.details).map((s) => `- ${s.title} (${s.projectName}): ${s.details.slice(0, 300)}`);
  let steps = null;
  const config = serviceConfig();
  const allowed = config ? await supabaseTriageIo(config.supabaseUrl, config.serviceRoleKey).takeCall(projectId) : true;
  if (allowed && process.env.AI_PROVIDER === "bedrock") {
    try {
      steps = parsePlan(await aiAsk(process.env, async () => "")(PLAN_SYSTEM_PROMPT, buildPlanPrompt({ today, risk, lessons, tasks }), 1500));
    } catch (error) {
      logError("Bedrock failed, remediation plan using fallback", error);
    }
  }
  const placed = placeOwners(steps ?? fallbackPlan(risk.title, today), people, tasks);
  await saveProposedSteps(supabase, riskId, projectId, "ai", placed);
  revalidatePath(`/app/risks/${riskId}`);
}

export async function decideStep(form: FormData): Promise<void> {
  await resolveStep(await supabaseServer(), String(form.get("stepId")), form.get("accept") === "1");
  revalidatePath("/app/risks");
  revalidatePath("/app/gantt");
}
