import type { Member } from "@/data/projects";
import type { RiskRow } from "@/data/risks";
import type { StepRow } from "@/data/riskPlan";
import { riskBand, riskScore } from "@/domain/risk";
import type { Similar } from "@/domain/riskSimilar";
import type { MessageKey } from "@/lib/messages";

type Act = (form: FormData) => void | Promise<void>;
type Props = {
  t: (key: MessageKey) => string;
  risk: RiskRow; code: string; back: string; projectParam: string;
  members: Pick<Member, "userId" | "name">[];
  steps: StepRow[];
  similar: Similar<RiskRow & { projectName: string }>[]; analyzed: boolean;
  actions: { save: Act; toggle: Act; propose: Act; decide: Act };
};
const LEVELS = [1, 2, 3, 4, 5];
const TONE = { low: "ok", medium: "warn", high: "bad" } as const;

// The detail screen: description and plan on the left, scoring and owner on the right. Pure markup so it can be rendered without a database.
export function RiskDetailView({ t, risk, code, back, projectParam, members, steps, similar, analyzed, actions }: Props) {
  const score = riskScore(risk.likelihood, risk.severity, risk.kind);
  const band = riskBand(score);
  const nameOf = (id: string | null) => members.find((m) => m.userId === id)?.name ?? t("risks.noOwner");
  const kind = (k: string) => t(`risks.kind.${k}` as MessageKey);
  return (
    <main id="main" className="page">
      <p><a className="rk-back" href={back}>← {t("risks.back")}</a></p>
      <div className="rk-head">
        <div><p className="eyebrow"><span className="rk-id">{code}</span> · {kind(risk.kind)}</p><h1>{risk.title}</h1></div>
        <div className="rk-actions">
          <form action={actions.toggle}>
            <input type="hidden" name="id" value={risk.id} />
            <input type="hidden" name="to" value={risk.status === "open" ? "closed" : "open"} />
            <button type="submit" className="act">{t(risk.status === "open" ? "risks.close" : "risks.reopen")}</button>
          </form>
          <form method="get">
            <input type="hidden" name="project" value={projectParam} />
            <button type="submit" name="analyze" value="1" className="act act-primary">{t("risks.analyze")}</button>
          </form>
        </div>
      </div>
      <form id="rk-edit" action={actions.save}><input type="hidden" name="id" value={risk.id} /></form>
      <div className="rk-detail">
        <div className="rk-col">
          <section className="surface rk-card" aria-labelledby="rk-d">
            <h2 id="rk-d">{t("risks.details")}</h2>
            <label className="rk-lab">{t("risks.newTitle")}<input form="rk-edit" name="title" className="rk-in" defaultValue={risk.title} required maxLength={200} /></label>
            <label className="rk-lab">{t("risks.details")}<textarea form="rk-edit" name="details" className="rk-in" rows={5} maxLength={4000} defaultValue={risk.details} /></label>
            {risk.sourceMessageId && <p><a className="rk-link" href={`/app/stream?message=${risk.sourceMessageId}`}>{t("risks.source")} ↗</a></p>}
          </section>
          <section className="surface rk-card" aria-labelledby="rk-plan">
            <div className="rk-card-top"><h2 id="rk-plan">{t("risks.plan")}</h2>
              <form action={actions.propose}><input type="hidden" name="id" value={risk.id} /><button type="submit" className="act">{t("risks.proposePlan")}</button></form>
            </div>
            {steps.length === 0 && <p className="meta">{t("risks.planEmpty")}</p>}
            <ul className="rk-steps">
              {steps.map((st) => (
                <li key={st.id}>
                  <div className="rk-card-top"><strong>{st.title}</strong>{st.status === "accepted" ? <span className="st st-ok">{t("risks.step.accepted")}</span> : <span className="st">{t("risks.step.proposed")}</span>}</div>
                  <p className="meta">{st.startDate ?? "?"} → {st.dueDate ?? "?"} · {nameOf(st.ownerId)}{st.origin === "ai" ? ` · ${t("risks.aiMade")}` : ""}</p>
                  {st.reason && <p>{st.reason}</p>}
                  {st.gapNote && <p className="rk-gap">{st.gapNote}</p>}
                  {st.status === "proposed" && (
                    <form action={actions.decide} className="rk-actions">
                      <input type="hidden" name="stepId" value={st.id} />
                      <button type="submit" name="accept" value="1" className="act act-primary">{t("risks.step.accept")}</button>
                      <button type="submit" name="accept" value="0" className="act">{t("risks.step.dismiss")}</button>
                    </form>
                  )}
                </li>
              ))}
            </ul>
          </section>
          {analyzed && similar.length > 0 && (
            <section className="surface rk-card" aria-labelledby="rk-sim">
              <h2 id="rk-sim">{t("risks.similar")}</h2>
              <ul className="rk-steps">
                {similar.map((s) => (
                  <li key={s.id}>
                    <div className="rk-card-top"><strong>{s.title}</strong><span className="st">{Math.round(s.similarity * 100)}%</span></div>
                    <p className="meta">{s.projectName} · {kind(s.kind)} · {t(`risk.${s.status}` as MessageKey)}</p>
                    {s.details && <p><em>{t("risks.lesson")}</em> {s.details.slice(0, 300)}</p>}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
        <aside className="surface rk-card" aria-labelledby="rk-side">
          <h2 id="rk-side">{t("risks.detailsTitle")}</h2>
          <dl className="rk-dl">
            <dt>{t("risk.state")}</dt><dd><span className={`st st-${risk.status === "open" ? "warn" : "ok"}`}>{t(`risk.${risk.status}` as MessageKey)}</span></dd>
            <dt>{t("risks.score")}</dt><dd><span className={`st st-${TONE[band]}`}>{score} · {t(`risks.band.${band}` as MessageKey)}</span></dd>
            <dt><label htmlFor="rk-kind">{t("risk.kindLabel")}</label></dt>
            <dd><select id="rk-kind" form="rk-edit" name="kind" className="rk-in" defaultValue={risk.kind}><option value="risk">{kind("risk")}</option><option value="issue">{kind("issue")}</option></select></dd>
            <dt><label htmlFor="rk-l">{t("risks.likelihood")}</label></dt>
            <dd><select id="rk-l" form="rk-edit" name="likelihood" className="rk-in" defaultValue={risk.likelihood}>{LEVELS.map((n) => <option key={n}>{n}</option>)}</select></dd>
            <dt><label htmlFor="rk-s">{t("risks.severity")}</label></dt>
            <dd><select id="rk-s" form="rk-edit" name="severity" className="rk-in" defaultValue={risk.severity}>{LEVELS.map((n) => <option key={n}>{n}</option>)}</select></dd>
            <dt><label htmlFor="rk-o">{t("risks.owner")}</label></dt>
            <dd><select id="rk-o" form="rk-edit" name="ownerId" className="rk-in" defaultValue={risk.ownerId ?? ""}><option value="">{t("risks.noOwner")}</option>{members.map((m) => <option key={m.userId} value={m.userId}>{m.name}</option>)}</select></dd>
            <dt><label htmlFor="rk-due">{t("risks.due")}</label></dt>
            <dd><input id="rk-due" form="rk-edit" type="date" name="dueDate" className="rk-in" defaultValue={risk.dueDate ?? ""} /></dd>
          </dl>
          <button type="submit" form="rk-edit" className="act act-primary">{t("risks.save")}</button>
        </aside>
      </div>
    </main>
  );
}
