import { supabaseServer } from "@/auth/supabase";
import { listMembers } from "@/data/projects";
import { getRisk, listOtherRisks } from "@/data/risks";
import { findSimilar } from "@/domain/riskSimilar";
import { riskBand, riskScore } from "@/domain/risk";
import { getT } from "@/lib/locale";
import type { MessageKey } from "@/lib/messages";
import { saveRisk, toggleRiskStatus } from "../actions";

const LEVELS = [1, 2, 3, 4, 5];

export default async function RiskDetail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ project?: string; analyze?: string }> }) {
  const t = await getT();
  const supabase = await supabaseServer();
  const risk = await getRisk(supabase, (await params).id).catch(() => null);
  const back = `/app/risks${(await searchParams).project ? `?project=${(await searchParams).project}` : ""}`;
  if (!risk) return <main id="main" className="page"><p><a href={back}>{t("risks.back")}</a></p><p>{t("risks.notFound")}</p></main>;
  const { data: pr } = await supabase.from("risks").select("project_id").eq("id", risk.id).single();
  const members = pr ? await listMembers(supabase, pr.project_id as string) : [];
  const sp = await searchParams;
  // Only when asked: compare with risks and issues of the other projects this person can see.
  const similar = sp.analyze && pr ? findSimilar(risk, await listOtherRisks(supabase, pr.project_id as string)) : [];
  const score = riskScore(risk.likelihood, risk.severity, risk.kind);
  const level = (name: string, label: MessageKey, v: number) => (
    <label>{t(label)} <select name={name} className="field" defaultValue={v}>{LEVELS.map((n) => <option key={n}>{n}</option>)}</select></label>
  );
  return (
    <main id="main" className="page">
      <p><a href={back}>← {t("risks.back")}</a></p>
      <div className="board-head">
        <h1>{risk.title}</h1>
        <form action={toggleRiskStatus}>
          <input type="hidden" name="id" value={risk.id} />
          <input type="hidden" name="to" value={risk.status === "open" ? "closed" : "open"} />
          <button type="submit" className="act">{t(risk.status === "open" ? "risks.close" : "risks.reopen")}</button>
        </form>
      </div>
      <div className="rk-detail">
        <div className="rk-fields">
        <form action={saveRisk} className="surface rk-fields">
          <input type="hidden" name="id" value={risk.id} />
          <label>{t("risks.newTitle")} <input name="title" className="field" defaultValue={risk.title} required maxLength={200} /></label>
          <label>{t("risks.details")} <textarea name="details" className="field" rows={6} maxLength={4000} defaultValue={risk.details} /></label>
          <div className="rk-form">
            <label>{t("risk.kindLabel")} <select name="kind" className="field" defaultValue={risk.kind}><option value="risk">{t("risks.kind.risk")}</option><option value="issue">{t("risks.kind.issue")}</option></select></label>
            {level("likelihood", "risks.likelihood", risk.likelihood)}
            {level("severity", "risks.severity", risk.severity)}
          </div>
          <div className="rk-form">
            <label>{t("risks.owner")} <select name="ownerId" className="field" defaultValue={risk.ownerId ?? ""}><option value="">{t("risks.noOwner")}</option>{members.map((m) => <option key={m.userId} value={m.userId}>{m.name}</option>)}</select></label>
            <label>{t("risks.due")} <input type="date" name="dueDate" className="field" defaultValue={risk.dueDate ?? ""} /></label>
          </div>
          <div><button type="submit" className="btn">{t("risks.save")}</button></div>
        </form>
        <form method="get" className="surface rk-fields">
          <input type="hidden" name="project" value={sp.project ?? ""} />
          <button type="submit" name="analyze" value="1" className="btn">{t("risks.analyze")}</button>
          {similar.length > 0 && (
            <>
              <h2>{t("risks.similar")}</h2>
              <ul className="rk-fields">
                {similar.map((s) => (
                  <li key={s.id}>
                    <strong>{s.title}</strong> <span className="st">{Math.round(s.similarity * 100)}%</span>
                    <p className="meta">{s.projectName} · {t(`risks.kind.${s.kind}` as MessageKey)} · {t(`risk.${s.status}` as MessageKey)}</p>
                    {s.details && <p><em>{t("risks.lesson")}</em> {s.details.slice(0, 300)}</p>}
                  </li>
                ))}
              </ul>
            </>
          )}
        </form>
        </div>
        <aside className="surface">
          <p><span className={`st st-${{ low: "ok", medium: "warn", high: "bad" }[riskBand(score)]}`}>{t("risks.score")} {score} · {t(`risks.band.${riskBand(score)}` as MessageKey)}</span></p>
          <p className="meta">{t(`risk.${risk.status}` as MessageKey)}</p>
          {risk.sourceMessageId && <p><a href={`/app/stream?message=${risk.sourceMessageId}`}>{t("risks.source")}</a></p>}
        </aside>
      </div>
    </main>
  );
}
