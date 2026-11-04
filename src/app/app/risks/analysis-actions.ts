"use server";

import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/auth/supabase";
import { getT } from "@/lib/locale";
import { analyze, answerQuestion, latestAnalysis, loadAnalysisInput, saveAnalysis } from "@/server/risk-analysis";
import { aiAsk } from "@/server/triage-run";

const today = () => new Date().toISOString().slice(0, 10);
const ask = () => aiAsk(process.env, async () => "");

// A project manager refreshes the analysis now; the weekly job does the same on its own. Nothing but the analysis row is written.
export async function refreshAnalysis(projectId: string): Promise<void> {
  const supabase = await supabaseServer();
  await saveAnalysis(supabase, projectId, "manual", await analyze(await loadAnalysisInput(supabase, projectId), projectId, ask(), today()));
  revalidatePath("/app/risks");
}

// A follow-up question in the analysis chat. Returns the answer, or a note that the AI is off.
export async function askAnalysis(projectId: string, question: string): Promise<string> {
  const t = await getT();
  const supabase = await supabaseServer();
  const q = question.trim().slice(0, 800);
  if (!q) return "";
  const [input, latest] = await Promise.all([loadAnalysisInput(supabase, projectId), latestAnalysis(supabase, projectId)]);
  return (await answerQuestion(input, latest, q, ask(), projectId, today())) ?? t("analysis.chatOff");
}
