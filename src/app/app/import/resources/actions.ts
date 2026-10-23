"use server";

import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/auth/supabase";
import { listMembers } from "@/data/projects";
import { checkResourceData, parseResources, planOwners, type ResourceData } from "@/domain/resourceImport";
import type { MessageKey } from "@/lib/messages";

export type ResourceState = {
  error?: MessageKey;
  data?: ResourceData;
  counts?: { assign: number; unchanged: number; skipped: number };
  unmatched?: { id: string; name: string }[];
  done?: boolean;
};

const FILE_MAX = 10 * 1024 * 1024;
const fail = (error: MessageKey): ResourceState => ({ error });

async function load(projectId: string, data: ResourceData, picks: Record<string, string>) {
  const supabase = await supabaseServer();
  const [members, { data: rows }] = await Promise.all([
    listMembers(supabase, projectId),
    supabase.from("tasks").select("id, title, owner_id").eq("project_id", projectId).is("parent_id", null),
  ]);
  const tasks = (rows ?? []).map((t) => ({ id: t.id as string, title: t.title as string, ownerId: t.owner_id as string | null }));
  return { supabase, members, plan: planOwners(data, tasks, members, picks) };
}

const summary = (p: Awaited<ReturnType<typeof load>>["plan"]) => ({
  counts: { assign: p.set.length, unchanged: p.unchanged, skipped: p.skipped },
  unmatched: p.unmatched.map((r) => ({ id: r.id, name: r.name })),
});

// Nothing is written here: the manager sees who is matched and who needs a click first.
export async function previewResources(_prev: ResourceState, form: FormData): Promise<ResourceState> {
  const file = form.get("plan");
  if (!(file instanceof File) || !file.size) return fail("import.noFile");
  if (file.size > FILE_MAX) return fail("import.tooBig");
  const parsed = parseResources(await file.text());
  if (!parsed.ok) return fail(parsed.error);
  const data = { resources: parsed.resources, assignments: parsed.assignments };
  return { data, ...summary((await load(String(form.get("projectId")), data, {})).plan) };
}

// Row-level security lets only project managers write. Only tasks without an owner get one.
export async function applyResources(_prev: ResourceState, form: FormData): Promise<ResourceState> {
  const projectId = String(form.get("projectId"));
  let data: ResourceData | null = null;
  try { data = checkResourceData(JSON.parse(String(form.get("data")))); } catch { /* handled below */ }
  if (!data) return fail("import.invalid");
  const picks: Record<string, string> = {};
  for (const [k, v] of form.entries()) if (k.startsWith("pick:") && typeof v === "string" && v) picks[k.slice(5)] = v;
  const { supabase, plan } = await load(projectId, data, picks);
  for (const t of plan.set) {
    const { error } = await supabase.from("tasks").update({ owner_id: t.ownerId }).eq("id", t.id);
    if (error) return fail("settings.saveError");
  }
  revalidatePath("/app", "layout");
  return { done: true, ...summary(plan) };
}
