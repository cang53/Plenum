// One turn of the remediation plan studio: load the project's context, ask the model (or the offline rules), return the new draft.
// Nothing is saved here; the draft only becomes tasks when a project manager adds it.
import type { SupabaseClient } from "@supabase/supabase-js";
import { listMembers } from "@/data/projects";
import { getRisk, listOtherRisks, type RiskRow } from "@/data/risks";
import { baseLoad, bestOwner, fallbackSteps, mondayOf, parseDraft, placeDraft, ruleEdit, stepsFromNotes, studioPrompt, STUDIO_SYSTEM, WEEKS, type Draft, type Person, type TaskLite } from "@/domain/planStudio";
import { isoWeek } from "@/domain/riskPlan";
import { findSimilar } from "@/domain/riskSimilar";
import { logError } from "@/lib/log";
import { serviceConfig } from "./inbound-config";
import type { Ask } from "./triage";
import { supabaseTriageIo } from "./triage-run";

export type StudioContext = { risk: RiskRow; projectId: string; people: Person[]; tasks: TaskLite[]; weekStart: string; weekNames: string[]; lessons: string[]; base: Record<string, number[]> };

const shift = (d: string, n: number) => new Date(Date.parse(`${d}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);
export const weekNamesFrom = (weekStart: string) => Array.from({ length: WEEKS }, (_, i) => `W${isoWeek(shift(weekStart, i * 7))}`);

export async function loadStudio(supabase: SupabaseClient, riskId: string, today = new Date().toISOString().slice(0, 10)): Promise<StudioContext> {
  const risk = await getRisk(supabase, riskId);
  if (!risk) throw new Error("risk not found or not allowed");
  const { data: pr, error } = await supabase.from("risks").select("project_id").eq("id", riskId).single();
  if (error) throw error;
  const projectId = pr.project_id as string;
  const [members, tasksRes, others] = await Promise.all([
    listMembers(supabase, projectId),
    supabase.from("tasks").select("title, start_date, due_date, owner_id").eq("project_id", projectId).neq("status", "done").limit(300),
    listOtherRisks(supabase, projectId),
  ]);
  if (tasksRes.error) throw tasksRes.error;
  const people = members.map((m) => ({ userId: m.userId, name: m.name || m.email, role: m.role }));
  const tasks = (tasksRes.data ?? []).map((t) => ({ title: t.title as string, startDate: t.start_date as string | null, dueDate: t.due_date as string | null, ownerId: t.owner_id as string | null }));
  const weekStart = mondayOf(today);
  const lessons = findSimilar(risk, others, 3).filter((s) => s.details).map((s) => `- ${s.title} (${s.projectName}): ${s.details.slice(0, 300)}`);
  return { risk, projectId, people, tasks, weekStart, weekNames: weekNamesFrom(weekStart), lessons, base: baseLoad(people, tasks, weekStart) };
}

const weekIndex = (d: string | null, weekStart: string) => (d ? Math.floor((Date.parse(d) - Date.parse(weekStart)) / (7 * 86_400_000)) : null);

async function modelAllowed(projectId: string): Promise<boolean> {
  if (process.env.AI_PROVIDER !== "bedrock") return false;
  const config = serviceConfig();
  return config ? supabaseTriageIo(config.supabaseUrl, config.serviceRoleKey).takeCall(projectId) : true;
}

export type StudioTurn = { reply: { text: string } | { key: string; params?: Record<string, string> }; steps: Draft[]; changed?: number };

// Keeps the ids of steps whose title is unchanged, so the screen can animate them instead of redrawing.
const keepIds = (steps: Draft[], old: Draft[]): Draft[] => {
  let next = Math.max(0, ...old.map((s) => s.id)) + 1;
  return steps.map((s) => ({ ...s, id: old.find((o) => o.title.toLowerCase() === s.title.toLowerCase())?.id ?? next++ }));
};

export async function studioTurn(ctx: StudioContext, request: string, current: Draft[], ask: Ask, today: string): Promise<StudioTurn> {
  if (await modelAllowed(ctx.projectId)) {
    try {
      const prompt = studioPrompt({ today, risk: ctx.risk, lessons: ctx.lessons, current, request, people: ctx.people,
        tasks: ctx.tasks.map((t) => ({ title: t.title, startWeek: weekIndex(t.startDate, ctx.weekStart), endWeek: weekIndex(t.dueDate, ctx.weekStart) })) });
      const parsed = parseDraft(await ask(STUDIO_SYSTEM, prompt, 1800), ctx.people);
      if (parsed) {
        const steps = placeDraft(keepIds(parsed.steps, current), ctx.people, ctx.base, (s) => !current.some((o) => o.id === s.id) || !!current.find((o) => o.id === s.id)?.owner);
        const changed = steps.find((s) => { const o = current.find((x) => x.id === s.id); return !o || o.s !== s.s || o.l !== s.l || o.owner !== s.owner; })?.id;
        return { reply: parsed.reply ? { text: parsed.reply } : { key: "ps.r.updated" }, steps, changed };
      }
    } catch (error) {
      logError("Bedrock failed, plan studio using rules", error);
    }
  }
  if (current.length === 0) {
    const steps = placeDraft(fallbackSteps(), ctx.people, ctx.base);
    return { reply: { key: "ps.r.proposed" }, steps };
  }
  const out = ruleEdit(request, current, ctx.people, ctx.base, ctx.weekNames);
  return { reply: out.reply, steps: out.steps, changed: out.changed };
}

export async function studioNotes(ctx: StudioContext, notes: string, ask: Ask, today: string): Promise<Draft[]> {
  if (await modelAllowed(ctx.projectId)) {
    try {
      const parsed = parseDraft(await ask(STUDIO_SYSTEM, studioPrompt({ today, risk: ctx.risk, lessons: [], current: [], people: ctx.people, tasks: [], request: `Turn these notes into steps, one per action, keep their order. Use owner null.\n${notes}` }), 1500), ctx.people);
      if (parsed) return parsed.steps.map((s) => ({ ...s, owner: null }));
    } catch (error) {
      logError("Bedrock failed, plan studio notes using rules", error);
    }
  }
  return stepsFromNotes(notes);
}

export { bestOwner };
