import type { Member } from "@/data/projects";
import type { RiskRow } from "@/data/risks";
import { Choice } from "./Choice";
import { RiskTabs } from "./RiskTabs";
import { riskBand, riskScore } from "@/domain/risk";
import type { Similar } from "@/domain/riskSimilar";
import type { MessageKey } from "@/lib/messages";

type Act = (form: FormData) => void | Promise<void>;
type Props = {
  t: (key: MessageKey) => string;
  risk: RiskRow; code: string; back: string; projectParam: string;
  members: Pick<Member, "userId" | "name">[]; tasks: { id: string; title: string; label?: string }[]; ask?: React.ReactNode;
  similar: Similar<RiskRow & { projectName: string }>[]; analyzed: boolean;
  actions: { save: Act; toggle: Act };
};
const LEVELS = [1, 2, 3, 4, 5];
const levels = LEVELS.map((n) => ({ value: String(n), label: String(n) }));
const TONE = { low: "ok", medium: "warn", high: "bad" } as const;

// The detail screen: description and plan on the left, scoring and owner on the right. Pure markup so it can be rendered without a database.
export function RiskDetailView({ t, risk, code, back, projectParam, members, tasks, ask, similar, analyzed, actions }: Props) {
  const score = riskScore(risk.likelihood, risk.severity, risk.kind);
  const band = riskBand(score);
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
      <RiskTabs t={t} id={risk.id} projectParam={projectParam} current="details" />
      {ask}
      <form id="rk-edit" action={actions.save}><input type="hidden" name="id" value={risk.id} /></form>
      <div className="rk-detail">
        <div className="rk-col">
          <section className="surface rk-card" aria-labelledby="rk-d">
            <h2 id="rk-d">{t("risks.details")}</h2>
            <label className="rk-lab">{t("risks.newTitle")}<input form="rk-edit" name="title" className="rk-in" defaultValue={risk.title} required maxLength={200} /></label>
            <label className="rk-lab">{t("risks.details")}<textarea form="rk-edit" name="details" className="rk-in" rows={5} maxLength={4000} defaultValue={risk.details} /></label>
            {risk.sourceMessageId && <p><a className="rk-link" href={`/app/stream?message=${risk.sourceMessageId}`}>{t("risks.source")} ↗</a></p>}
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
            <dt>{t("risks.remediation")}</dt><dd><span className={`st st-${risk.remediation === "none" ? "todo" : risk.remediation === "remediated" ? "ok" : "go"}`}>{t(`risks.remediation.${risk.remediation}` as MessageKey)}</span></dd>
            <dt>{t("risks.score")}</dt><dd><span className={`st st-${TONE[band]}`}>{score} · {t(`risks.band.${band}` as MessageKey)}</span></dd>
            <dt className="rk-full"><Choice form="rk-edit" name="kind" label={t("risk.kindLabel")} value={risk.kind} options={[{ value: "risk", label: kind("risk") }, { value: "issue", label: kind("issue") }]} /></dt>
            <dt className="rk-full"><label className="rk-lab">{t("risks.linkedTask")}<select key={risk.linkedTaskId ?? "none"} form="rk-edit" name="linkedTaskId" className="rk-in" defaultValue={risk.linkedTaskId ?? ""}><option value="">{t("risks.noLinkedTask")}</option>{tasks.map((x) => <option key={x.id} value={x.id}>{x.label ?? x.title}</option>)}</select></label></dt>
            <dt className="rk-full"><Choice form="rk-edit" name="likelihood" label={t("risks.likelihood")} value={String(risk.likelihood)} options={levels} /></dt>
            <dt className="rk-full"><Choice form="rk-edit" name="severity" label={t("risks.severity")} value={String(risk.severity)} options={levels} /></dt>
            <dt className="rk-full"><Choice form="rk-edit" name="ownerId" label={t("risks.owner")} value={risk.ownerId ?? ""} options={[{ value: "", label: t("risks.noOwner") }, ...members.map((m) => ({ value: m.userId, label: m.name }))]} /></dt>
            <dt><label htmlFor="rk-due">{t("risks.due")}</label></dt>
            <dd><input id="rk-due" form="rk-edit" type="date" name="dueDate" className="rk-in" defaultValue={risk.dueDate ?? ""} /></dd>
          </dl>
          <button type="submit" form="rk-edit" className="act act-primary">{t("risks.save")}</button>
        </aside>
      </div>
    </main>
  );
}
