import { supabaseServer } from "@/auth/supabase";
import { currentProject, listProjects } from "@/data/projects";
import { getRisk, listRisks } from "@/data/risks";
import { listSnapshots, listSteps } from "@/data/riskPlan";
import { extractDate, suggestTask } from "@/domain/riskLink";
import { answerLink } from "../../actions";
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
  const [all, steps, projects, snaps] = await Promise.all([listRisks(supabase, ctx.projectId), listSteps(supabase, id), listProjects(supabase), listSnapshots(supabase, id)]);
  const canManage = Boolean((await supabase.rpc("can_manage_project", { p: ctx.projectId })).data);
  void currentProject(projects, ctx.projectId);
  const col = (d: string) => Math.floor((Date.parse(d) - Date.parse(ctx.weekStart)) / (7 * DAY));
  const linked = ctx.tasks.find((x) => x.id === risk.linkedTaskId);
  const bars = ctx.tasks.flatMap((x) => {
    if (!x.startDate || !x.dueDate || col(x.dueDate) < 0 || col(x.startDate) > WEEKS - 1) return [];
    const s = Math.max(0, col(x.startDate));
    return [{ title: x.title, s, l: Math.min(WEEKS - 1, col(x.dueDate)) - s + 1, hot: x === linked }];
  });
  const existing = [...bars.filter((b) => b.hot), ...bars.filter((b) => !b.hot)].slice(0, 6);
  const day = extractDate(`${risk.title} ${risk.details}`, ctx.weekStart);
  const at = day ? (Date.parse(day) - Date.parse(ctx.weekStart)) / (7 * DAY) : null;
  const marker = at !== null && at >= 0 && at < WEEKS ? at : null;
  const withIds = ctx.tasks.filter((x): x is typeof x & { id: string } => Boolean(x.id));
  const guess = !linked && !risk.linkDeclined ? suggestTask(risk, withIds) : null;
  const labels = Object.fromEntries(STUDIO_KEYS.map((k) => [k, t(k as MessageKey)])) as Record<(typeof STUDIO_KEYS)[number], string>;
  const code = riskCodes(all).get(id) ?? "";
  const done = steps.filter((s) => s.status === "accepted");
  return (
    <main id="main" className="page">
      <p><a className="rk-back" href={back}>← {t("risks.back")}</a></p>
      <div className="rk-head"><div><p className="eyebrow"><span className="rk-id">{code}</span> · {t(`risks.kind.${risk.kind}` as MessageKey)}</p><h1>{risk.title}</h1></div></div>
      <RiskTabs t={t} id={id} projectParam={sp.project ?? ""} current="plan" />
      {guess && (
        <section className="surface rk-card" aria-label={t("risks.linkedTask")}>
          <p>{t("risks.linkAsk").replace("{title}", guess.title)}</p>
          <div className="rk-actions">
            <form action={answerLink}><input type="hidden" name="id" value={id} /><input type="hidden" name="linkedTaskId" value={guess.id} /><button type="submit" className="act act-primary">{t("risks.linkYes")}</button></form>
            <form action={answerLink}><input type="hidden" name="id" value={id} /><button type="submit" className="act">{t("risks.linkNo")}</button></form>
            <form action={answerLink}><input type="hidden" name="id" value={id} /><select name="linkedTaskId" className="rk-in" aria-label={t("risks.linkOther")} required defaultValue=""><option value="" disabled>{t("risks.linkOther")}</option>{withIds.map((x) => <option key={x.id} value={x.id}>{x.title}</option>)}</select> <button type="submit" className="act">{t("risks.linkSave")}</button></form>
          </div>
        </section>
      )}
      <PlanStudio riskId={id} people={ctx.people} weekNames={ctx.weekNames} existing={existing} marker={marker} base={ctx.base} labels={labels} canManage={canManage} />
      {snaps.length > 0 && (
        <section className="surface rk-card" aria-labelledby="rk-snap">
          <h2 id="rk-snap">{t("risks.snapshot")}</h2>
          <p className="meta"><span className="st st-go">{t(`risks.remediation.${risk.remediation}` as MessageKey)}</span> · {snaps[0].createdAt.slice(0, 10)} · {ctx.people.find((p) => p.userId === snaps[0].createdBy)?.name ?? ""}</p>
          <ul className="rk-steps">{snaps[0].doc.steps.map((s, i) => <li key={i}><strong>{s.title}</strong><p className="meta">{snaps[0].doc.weekNames[s.s]} → {snaps[0].doc.weekNames[s.s + s.l - 1]} · {ctx.people.find((p) => p.userId === s.owner)?.name ?? t("risks.noOwner")}</p></li>)}</ul>
          <h3>{t("risks.snapshotChat")}</h3>
          <ul className="rk-steps">{snaps[0].doc.chat.map((m, i) => <li key={i}><p className="meta">{m.who === "me" ? t("risks.snapshotYou") : t("ps.agent")}</p><p>{m.text}</p></li>)}</ul>
        </section>
      )}
      {done.length > 0 && (
        <section className="surface rk-card" aria-labelledby="rk-done">
          <h2 id="rk-done">{t("risks.step.accepted")}</h2>
          <ul className="rk-steps">{done.map((s) => <li key={s.id}><div className="rk-card-top"><strong>{s.title}</strong><span className="st st-ok">{t("risks.step.accepted")}</span></div><p className="meta">{s.startDate ?? "?"} → {s.dueDate ?? "?"} · {ctx.people.find((p) => p.userId === s.ownerId)?.name ?? t("risks.noOwner")}</p></li>)}</ul>
        </section>
      )}
    </main>
  );
}
