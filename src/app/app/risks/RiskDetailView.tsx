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

// The detail screen: editable title, details, then description. Pure markup so it can be rendered without a database.
export function RiskDetailView({ t, risk, code, back, projectParam, members, tasks, ask, similar, analyzed, actions }: Props) {
  const score = riskScore(risk.likelihood, risk.severity, risk.kind);
  const band = riskBand(score);
  const kind = (k: string) => t(`risks.kind.${k}` as MessageKey);
  return (
    <main id="main" className="page">
      <p><a className="rk-back" href={back}>← {t("risks.back")}</a></p>
      <div className="rk-head">
        <div><p className="eyebrow"><span className="rk-id">{code}</span> · {kind(risk.kind)}</p><h1><input form="rk-edit" name="title" className="rk-title" defaultValue={risk.title} required maxLength={200} aria-label={t("risks.newTitle")} /></h1></div>
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
      <RiskTabs t={t} id={risk.id} projectParam={projectParam} current="details" />
      {ask}
            <section className="surface rk-card" aria-labelledby="rk-side">
        <h2 id="rk-side">{t("risks.detailsTitle")}</h2>
        <div className="rk-facts">
          <div className="rk-fact"><span className="rk-k">{t("risk.state")}</span><span className={`st st-${risk.status === "open" ? "warn" : "ok"}`}>{t(`risk.${risk.status}` as MessageKey)}</span></div>
          <div className="rk-fact"><span className="rk-k">{t("risks.remediation")}</span><span className={`st st-${risk.remediation === "none" ? "todo" : risk.remediation === "remediated" ? "ok" : "go"}`}>{t(`risks.remediation.${risk.remediation}` as MessageKey)}</span></div>
          <div className="rk-fact"><span className="rk-k">{t("risks.score")}</span><span className={`st st-${TONE[band]}`}>{score} · {t(`risks.band.${band}` as MessageKey)}</span></div>
          <div className="rk-fact"><Choice form="rk-edit" name="kind" label={t("risk.kindLabel")} value={risk.kind} options={[{ value: "risk", label: kind("risk") }, { value: "issue", label: kind("issue") }]} /></div>
          <div className="rk-fact"><label className="rk-lab">{t("risks.linkedTask")}<select key={risk.linkedTaskId ?? "none"} form="rk-edit" name="linkedTaskId" className="rk-in" defaultValue={risk.linkedTaskId ?? ""}><option value="">{t("risks.noLinkedTask")}</option>{tasks.map((x) => <option key={x.id} value={x.id}>{x.label ?? x.title}</option>)}</select></label></div>
          <div className="rk-fact"><Choice form="rk-edit" name="likelihood" label={t("risks.likelihood")} value={String(risk.likelihood)} options={levels} /></div>
          <div className="rk-fact"><Choice form="rk-edit" name="severity" label={t("risks.severity")} value={String(risk.severity)} options={levels} /></div>
          <div className="rk-fact"><Choice form="rk-edit" name="ownerId" label={t("risks.owner")} value={risk.ownerId ?? ""} options={[{ value: "", label: t("risks.noOwner") }, ...members.map((m) => ({ value: m.userId, label: m.name }))]} /></div>
          <div className="rk-fact"><label className="rk-lab" htmlFor="rk-due">{t("risks.due")}<input id="rk-due" form="rk-edit" type="date" name="dueDate" className="rk-in" defaultValue={risk.dueDate ?? ""} /></label></div>
        </div>
      </section>
      <section className="surface rk-card">
        <textarea form="rk-edit" name="details" className="rk-in" rows={5} maxLength={4000} defaultValue={risk.details} aria-label={t("risks.details")} placeholder={t("risks.details")} />
        {risk.sourceMessageId && <p><a className="rk-link" href={`/app/stream?message=${risk.sourceMessageId}`}>{t("risks.source")} ↗</a></p>}
        <div><button type="submit" form="rk-edit" className="act act-primary">{t("risks.save")}</button></div>
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
    </main>
  );
}
