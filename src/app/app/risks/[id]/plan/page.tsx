import { supabaseServer } from "@/auth/supabase";
import { currentProject, listProjects } from "@/data/projects";
import { getRisk, listRisks } from "@/data/risks";
import { listSteps } from "@/data/riskPlan";
import { riskCodes } from "@/domain/risk";
import { WEEKS } from "@/domain/planStudio";
import { getT } from "@/lib/locale";
import type { MessageKey } from "@/lib/messages";
import { loadStudio } from "@/server/plan-studio";
import { PlanStudio } from "../../PlanStudio";
import { RiskTabs } from "../../RiskTabs";
import { STUDIO_KEYS } from "../../studioLabels";

const DAY = 86_400_000;

export default async function RiskPlanPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ project?: string }> }) {
  const t = await getT();
  const supabase = await supabaseServer();
  const sp = await searchParams;
  const id = (await params).id;
  const back = `/app/risks${sp.project ? `?project=${sp.project}` : ""}`;
  const risk = await getRisk(supabase, id).catch(() => null);
  if (!risk) return <main id="main" className="page"><p><a className="rk-back" href={back}>{t("risks.back")}</a></p><p>{t("risks.notFound")}</p></main>;
  const ctx = await loadStudio(supabase, id);
  const [all, steps, projects] = await Promise.all([listRisks(supabase, ctx.projectId), listSteps(supabase, id), listProjects(supabase)]);
  const canManage = Boolean((await supabase.rpc("can_manage_project", { p: ctx.projectId })).data);
  void currentProject(projects, ctx.projectId);
  const col = (d: string) => Math.floor((Date.parse(d) - Date.parse(ctx.weekStart)) / (7 * DAY));
  const existing = ctx.tasks.flatMap((x) => {
    if (!x.startDate || !x.dueDate || col(x.dueDate) < 0 || col(x.startDate) > WEEKS - 1) return [];
    const s = Math.max(0, col(x.startDate));
    return [{ title: x.title, s, l: Math.min(WEEKS - 1, col(x.dueDate)) - s + 1 }];
  }).slice(0, 6);
  const labels = Object.fromEntries(STUDIO_KEYS.map((k) => [k, t(k as MessageKey)])) as Record<(typeof STUDIO_KEYS)[number], string>;
  const code = riskCodes(all).get(id) ?? "";
  const done = steps.filter((s) => s.status === "accepted");
  return (
    <main id="main" className="page">
      <p><a className="rk-back" href={back}>← {t("risks.back")}</a></p>
      <div className="rk-head"><div><p className="eyebrow"><span className="rk-id">{code}</span> · {t(`risks.kind.${risk.kind}` as MessageKey)}</p><h1>{risk.title}</h1></div></div>
      <RiskTabs t={t} id={id} projectParam={sp.project ?? ""} current="plan" />
      <PlanStudio riskId={id} people={ctx.people} weekNames={ctx.weekNames} existing={existing} base={ctx.base} labels={labels} canManage={canManage} />
      {done.length > 0 && (
        <section className="surface rk-card" aria-labelledby="rk-done">
          <h2 id="rk-done">{t("risks.step.accepted")}</h2>
          <ul className="rk-steps">{done.map((s) => <li key={s.id}><div className="rk-card-top"><strong>{s.title}</strong><span className="st st-ok">{t("risks.step.accepted")}</span></div><p className="meta">{s.startDate ?? "?"} → {s.dueDate ?? "?"} · {ctx.people.find((p) => p.userId === s.ownerId)?.name ?? t("risks.noOwner")}</p></li>)}</ul>
        </section>
      )}
    </main>
  );
}
