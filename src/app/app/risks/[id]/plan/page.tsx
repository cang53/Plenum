import { supabaseServer } from "@/auth/supabase";
import { listMembers } from "@/data/projects";
import { getRisk, listRisks } from "@/data/risks";
import { listSteps } from "@/data/riskPlan";
import { riskCodes } from "@/domain/risk";
import { ownerLoad } from "@/domain/riskPlan";
import { getT } from "@/lib/locale";
import { acceptSteps, discardPlan, proposePlan } from "../../actions";
import { RiskPlanView } from "../../RiskPlanView";

export default async function RiskPlanPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ project?: string }> }) {
  const t = await getT();
  const supabase = await supabaseServer();
  const sp = await searchParams;
  const risk = await getRisk(supabase, (await params).id).catch(() => null);
  const back = `/app/risks${sp.project ? `?project=${sp.project}` : ""}`;
  if (!risk) return <main id="main" className="page"><p><a className="rk-back" href={back}>{t("risks.back")}</a></p><p>{t("risks.notFound")}</p></main>;
  const { data: pr } = await supabase.from("risks").select("project_id").eq("id", risk.id).single();
  const projectId = pr?.project_id as string;
  const [people, steps, all, tasksRes] = await Promise.all([
    listMembers(supabase, projectId), listSteps(supabase, risk.id), listRisks(supabase, projectId),
    supabase.from("tasks").select("title, start_date, due_date, owner_id").eq("project_id", projectId).neq("status", "done").order("start_date").limit(300),
  ]);
  if (tasksRes.error) throw tasksRes.error;
  const tasks = (tasksRes.data ?? []).map((x) => ({ title: x.title as string, startDate: x.start_date as string | null, dueDate: x.due_date as string | null, ownerId: x.owner_id as string | null }));
  const loads = Object.fromEntries(steps.map((s) => [s.id, ownerLoad(s, s.ownerId, tasks)]));
  return (
    <RiskPlanView t={t} risk={risk} code={riskCodes(all).get(risk.id) ?? ""} back={back} projectParam={sp.project ?? ""} steps={steps} tasks={tasks} people={people.map((p) => ({ userId: p.userId, name: p.name, role: p.role }))} loads={loads}
      actions={{ propose: proposePlan, accept: acceptSteps, discard: discardPlan }} />
  );
}
