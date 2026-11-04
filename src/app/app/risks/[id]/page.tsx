import { supabaseServer } from "@/auth/supabase";
import { listMembers } from "@/data/projects";
import { getRisk, listOtherRisks, listRisks } from "@/data/risks";
import { findSimilar } from "@/domain/riskSimilar";
import { riskCodes } from "@/domain/risk";
import { getT } from "@/lib/locale";
import { listSteps } from "@/data/riskPlan";
import { decideStep, proposePlan, saveRisk, toggleRiskStatus } from "../actions";

import { RiskDetailView } from "../RiskDetailView";
export default async function RiskDetail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ project?: string; analyze?: string }> }) {
  const t = await getT();
  const supabase = await supabaseServer();
  const sp = await searchParams;
  const risk = await getRisk(supabase, (await params).id).catch(() => null);
  const back = `/app/risks${sp.project ? `?project=${sp.project}` : ""}`;
  if (!risk) return <main id="main" className="page"><p><a className="rk-back" href={back}>{t("risks.back")}</a></p><p>{t("risks.notFound")}</p></main>;
  const { data: pr } = await supabase.from("risks").select("project_id").eq("id", risk.id).single();
  const projectId = pr?.project_id as string | undefined;
  const [members, steps, all] = await Promise.all([projectId ? listMembers(supabase, projectId) : [], listSteps(supabase, risk.id), projectId ? listRisks(supabase, projectId) : []]);
  // Only when asked: compare with risks and issues of the other projects this person can see.
  const similar = sp.analyze && projectId ? findSimilar(risk, await listOtherRisks(supabase, projectId)) : [];
  return (
    <RiskDetailView t={t} risk={risk} code={riskCodes(all).get(risk.id) ?? ""} back={back} projectParam={sp.project ?? ""} members={members} steps={steps} similar={similar} analyzed={Boolean(sp.analyze)}
      actions={{ save: saveRisk, toggle: toggleRiskStatus, propose: proposePlan, decide: decideStep }} />
  );
}
