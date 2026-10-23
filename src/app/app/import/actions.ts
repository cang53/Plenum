"use server";

import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/auth/supabase";
import { checkLinks, checkRows, parsePlan, planChanges, type ExistingTask, type Link, type PlanRow, type Skipped } from "@/domain/planImport";
import type { MessageKey } from "@/lib/messages";

export type ImportState = {
  error?: MessageKey;
  rows?: PlanRow[];
  links?: Link[];
  skipped?: Skipped[];
  counts?: { create: number; refresh: number; unchanged: number };
  done?: boolean;
};

const FILE_MAX = 10 * 1024 * 1024;
const fail = (error: MessageKey): ImportState => ({ error });

async function existingTasks(projectId: string): Promise<ExistingTask[]> {
  const { data } = await (await supabaseServer())
    .from("tasks")
    .select("id, title, start_date, due_date, phases(name)")
    .eq("project_id", projectId)
    .is("parent_id", null)
    .returns<{ id: string; title: string; start_date: string | null; due_date: string | null; phases: { name: string } | null }[]>();
  return (data ?? []).map((t) => ({ id: t.id, title: t.title, phase: t.phases?.name ?? "", start: t.start_date, due: t.due_date }));
}

// Nothing is written here: the manager sees what would be created or refreshed first.
export async function previewPlan(_prev: ImportState, form: FormData): Promise<ImportState> {
  const file = form.get("plan");
  if (!(file instanceof File) || !file.size) return fail("import.noFile");
  if (file.size > FILE_MAX) return fail("import.tooBig");
  const parsed = parsePlan(await file.text());
  if (!parsed.ok) return fail(parsed.error);
  const plan = planChanges(parsed.rows, await existingTasks(String(form.get("projectId"))));
  return { rows: parsed.rows, links: parsed.links, skipped: parsed.skipped, counts: { create: plan.create.length, refresh: plan.refresh.length, unchanged: plan.unchanged } };
}

// Row-level security lets only project managers write. Refreshing sets dates only: owners, status and links stay.
export async function applyPlan(_prev: ImportState, form: FormData): Promise<ImportState> {
  const projectId = String(form.get("projectId"));
  let rows: PlanRow[] | null = null;
  try { rows = checkRows(JSON.parse(String(form.get("rows")))); } catch { /* handled below */ }
  let links: Link[] | null = null;
  if (rows) try { links = checkLinks(JSON.parse(String(form.get("links"))), rows.length); } catch { /* handled below */ }
  if (!rows || !links) return fail("import.invalid");
  const supabase = await supabaseServer();
  const plan = planChanges(rows, await existingTasks(projectId));
  const { data: phases } = await supabase.from("phases").select("id, name, position").eq("project_id", projectId);
  const phaseId = new Map((phases ?? []).map((p) => [p.name.trim().toLowerCase(), p.id as string]));
  let position = Math.max(-1, ...(phases ?? []).map((p) => p.position)) + 1;
  for (const name of new Set(plan.create.map((r) => r.phase).filter(Boolean))) {
    if (phaseId.has(name.trim().toLowerCase())) continue;
    const { data, error } = await supabase.from("phases").insert({ project_id: projectId, name, position: position++ }).select("id").single();
    if (error || !data) return fail("settings.saveError");
    phaseId.set(name.trim().toLowerCase(), data.id);
  }
  if (plan.create.length) {
    const { error } = await supabase.from("tasks").insert(plan.create.map((r, i) => ({
      project_id: projectId, title: r.title, start_date: r.start, due_date: r.due, position: i,
      phase_id: r.phase ? phaseId.get(r.phase.trim().toLowerCase()) : null,
    })));
    if (error) return fail("settings.saveError");
  }
  for (const t of plan.refresh) {
    const { error } = await supabase.from("tasks").update({ start_date: t.start, due_date: t.due }).eq("id", t.id);
    if (error) return fail("settings.saveError");
  }
  if (links.length) {
    // Rows match tasks by phase and title, the same way planChanges did, so new and existing tasks both resolve.
    const idOf = new Map((await existingTasks(projectId)).map((t) => [`${t.phase.trim().toLowerCase()}|${t.title.trim().toLowerCase()}`, t.id]));
    const taskOf = (i: number) => idOf.get(`${rows[i].phase.trim().toLowerCase()}|${rows[i].title.trim().toLowerCase()}`);
    const deps = links.flatMap((l) => {
      const predecessor_id = taskOf(l.from), successor_id = taskOf(l.to);
      return predecessor_id && successor_id && predecessor_id !== successor_id ? [{ predecessor_id, successor_id, kind: l.kind, lag_days: l.lag }] : [];
    });
    // The database refuses a loop with links already in the project; nothing more is written then.
    const { error } = await supabase.from("task_dependencies").upsert(deps, { onConflict: "predecessor_id,successor_id" });
    if (error) return fail("import.cycle");
    await supabase.rpc("audit_dependency_import", { p_project: projectId });
  }
  revalidatePath("/app", "layout");
  return { done: true, links, counts: { create: plan.create.length, refresh: plan.refresh.length, unchanged: plan.unchanged } };
}
