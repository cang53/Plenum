"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/auth/supabase";
import { createRisk, updateRisk } from "@/data/risks";
import { clampLevel } from "@/domain/risk";

const kindOf = (v: unknown) => (v === "issue" ? "issue" : "risk");

// Row-level security decides who may add or change risks and issues.
export async function addRisk(form: FormData): Promise<void> {
  const projectId = String(form.get("projectId"));
  const title = String(form.get("title") ?? "").trim().slice(0, 200);
  if (!title) throw new Error("title is required");
  const id = await createRisk(await supabaseServer(), projectId, { kind: kindOf(form.get("kind")), title, details: String(form.get("details") ?? "").slice(0, 4000), likelihood: clampLevel(form.get("likelihood")), severity: clampLevel(form.get("severity")) });
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
    linkedTaskId: String(form.get("linkedTaskId") ?? "") || null, ownerId: owner || null, dueDate: /^\d{4}-\d{2}-\d{2}$/.test(due) ? due : null,
  });
  revalidatePath("/app/risks");
  revalidatePath(`/app/risks/${id}`);
  revalidatePath(`/app/risks/${id}/plan`);
}

export async function toggleRiskStatus(form: FormData): Promise<void> {
  await updateRisk(await supabaseServer(), String(form.get("id")), { status: form.get("to") === "closed" ? "closed" : "open" });
  revalidatePath("/app/risks", "layout");
}

// The person's answer to the suggested activity: yes or another activity links it; no remembers the refusal.
export async function answerLink(form: FormData): Promise<void> {
  const id = String(form.get("id"));
  const task = String(form.get("linkedTaskId") ?? "");
  await updateRisk(await supabaseServer(), id, task ? { linkedTaskId: task } : { linkDeclined: true });
  revalidatePath(`/app/risks/${id}`);
  revalidatePath(`/app/risks/${id}/plan`);
}
