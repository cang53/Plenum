"use server";

import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/auth/supabase";
import { updateRisk } from "@/data/risks";
import { insertSteps, resolveStep, saveSnapshot, taskIdsOf } from "@/data/riskPlan";
import { bestOwner, eligible, stepsFromNotes, weekDates, type Draft } from "@/domain/planStudio";
import { getT } from "@/lib/locale";
import type { MessageKey } from "@/lib/messages";
import { loadStudio, studioNotes, studioTurn } from "@/server/plan-studio";
import { aiAsk } from "@/server/triage-run";

const today = () => new Date().toISOString().slice(0, 10);
const ask = () => aiAsk(process.env, async () => "");
const fill = (text: string, params?: Record<string, string>) => Object.entries(params ?? {}).reduce((s, [k, v]) => s.replace(`{${k}}`, v), text);

// The agent answers a request and returns the whole new draft. Nothing is saved.
export async function studioChat(riskId: string, request: string, current: Draft[]): Promise<{ reply: string; steps: Draft[]; changed?: number }> {
  const t = await getT();
  const ctx = await loadStudio(await supabaseServer(), riskId, today());
  const turn = await studioTurn(ctx, request.slice(0, 1500), current.slice(0, 8), ask(), today());
  const reply = "text" in turn.reply ? turn.reply.text : fill(t(turn.reply.key as MessageKey), turn.reply.params);
  return { reply, steps: turn.steps, changed: turn.changed };
}

// Manual mode: the person's own words become steps with no owner; the screen then asks who does what.
export async function studioFromNotes(riskId: string, notes: string): Promise<Draft[]> {
  const ctx = await loadStudio(await supabaseServer(), riskId, today());
  const steps = await studioNotes(ctx, notes.slice(0, 4000), ask(), today());
  return steps.length ? steps : stepsFromNotes(notes);
}

// The suggestion shown with a question: the free person for this step, if any.
export async function studioSuggest(riskId: string, step: Draft, current: Draft[]): Promise<string | null> {
  const ctx = await loadStudio(await supabaseServer(), riskId, today());
  return bestOwner(step, current, ctx.people, ctx.base);
}

// A project manager adds the draft: each step becomes a task. The database checks who may and keeps the link to the risk's source message.
export async function studioCommit(riskId: string, origin: "ai" | "manual", steps: Draft[], chat: { who: "me" | "ai"; text: string }[] = [], existing: { title: string; s: number; l: number; hot?: boolean }[] = [], marker: number | null = null): Promise<{ n: number; taskIds: (string | undefined)[] }> {
  const supabase = await supabaseServer();
  const ctx = await loadStudio(supabase, riskId, today());
  const ok = new Set(eligible(ctx.people).map((p) => p.userId));
  const kept = steps.slice(0, 8).filter((s) => s.title.trim());
  const rows = kept.map((s) => ({ title: s.title.trim().slice(0, 200), ...weekDates(ctx.weekStart, s.s, s.l), ownerId: s.owner && ok.has(s.owner) ? s.owner : null, reason: s.why.slice(0, 500) }));
  const ids = await insertSteps(supabase, riskId, ctx.projectId, origin, rows);
  for (const id of ids) await resolveStep(supabase, id, true);
  const taskIds = await taskIdsOf(supabase, ids); // the same order as the kept steps; the screen colors these tasks green
  const clean = kept.map((s, i) => ({ title: s.title.trim().slice(0, 200), s: s.s, l: s.l, owner: s.owner, taskId: taskIds[i] }));
  await saveSnapshot(supabase, riskId, ctx.projectId, origin, { weekNames: ctx.weekNames, existing: existing.slice(0, 6), marker, steps: clean, chat: chat.slice(-40).map((m) => ({ who: m.who, text: m.text.slice(0, 1500) })) });
  await updateRisk(supabase, riskId, { remediation: "in_remediation" });
  revalidatePath("/app/gantt");
  revalidatePath(`/app/risks/${riskId}/plan`);
  revalidatePath(`/app/risks/${riskId}`);
  return { n: ids.length, taskIds };
}
