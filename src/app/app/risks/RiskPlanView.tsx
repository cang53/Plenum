import type { StepRow } from "@/data/riskPlan";
import type { MessageKey } from "@/lib/messages";
import { weekGrid } from "@/domain/riskPlan";
import { AcceptButton } from "./AcceptButton";
import { Choice } from "./Choice";
import { RiskTabs } from "./RiskTabs";

type Act = (form: FormData) => void | Promise<void>;
type Person = { userId: string; name: string; role: string };
export type PlanProps = {
  t: (key: MessageKey) => string;
  risk: { id: string; title: string; kind: "risk" | "issue" }; code: string; back: string; projectParam: string;
  steps: StepRow[]; tasks: { title: string; startDate: string | null; dueDate: string | null }[];
  people: Person[]; loads: Record<string, number>; // percent booked of each step's owner, by step id
  actions: { propose: Act; accept: Act; discard: Act };
};

// The remediation plan screen: timeline with the proposed bars hatched, owners with their availability, gaps, and a click to add the ticked steps.
export function RiskPlanView({ t, risk, code, back, projectParam, steps, tasks, people, loads, actions }: PlanProps) {
  const open = steps.filter((s) => s.status === "proposed");
  const grid = weekGrid(open, tasks);
  const name = (id: string | null) => people.find((p) => p.userId === id);
  const label = (s: StepRow) => `${s.startDate ?? "?"} → ${s.dueDate ?? "?"}`;
  return (
    <main id="main" className="page">
      <p><a className="rk-back" href={back}>← {t("risks.back")}</a></p>
      <div className="rk-head">
        <div><p className="eyebrow"><span className="rk-id">{code}</span> · {t(`risks.kind.${risk.kind}` as MessageKey)}</p><h1>{risk.title}</h1></div>
      </div>
      <RiskTabs t={t} id={risk.id} projectParam={projectParam} current="plan" />
      <div className="rk-head">
        <div><h2 className="rk-h2">{t("risks.planFor").replace("{code}", code)}</h2><p className="sub">{t("risks.planSub")}</p></div>
        <div className="rk-actions">
          <form action={actions.propose}><input type="hidden" name="id" value={risk.id} /><button type="submit" className="act">{t(open.length ? "risks.proposeAgain" : "risks.proposePlan")}</button></form>
          {open.length > 0 && <form action={actions.discard}><input type="hidden" name="id" value={risk.id} /><button type="submit" className="act">{t("risks.discard")}</button></form>}
          {open.length > 0 && <AcceptButton formId="rk-accept" label={t("risks.acceptN")} none={t("risks.acceptNone")} />}
        </div>
      </div>
      {open.length === 0 && <section className="surface rk-card"><p className="meta">{t("risks.planEmpty")}</p></section>}
      {open.length > 0 && (
        <>
          <section className="surface rk-card rk-ai" aria-labelledby="rk-tl">
            <h2 id="rk-tl"><span className="rk-aitag">{t("risks.aiTag")}</span> {t("risks.timelineTitle")}</h2>
            {grid.weeks.length > 0 && (
              <div className="rk-gantt-wrap">
                <div className="rk-gantt" role="img" aria-label={t("risks.timelineTitle")} style={{ gridTemplateColumns: `11rem repeat(${grid.weeks.length}, minmax(2rem, 1fr))` }}>
                  <div className="rk-gh rk-gl">{t("risks.weeks")}</div>
                  {grid.weeks.map((w) => <div key={w} className="rk-gh">{w}</div>)}
                  {grid.tasks.map((x, i) => (
                    <div key={`t-${x.title}`} style={{ display: "contents" }}>
                      <div className="rk-gl" style={{ gridColumn: 1, gridRow: i + 2 }}><span className="rk-tag">{t("risks.existing")}</span> {x.title}</div>
                      <div className="rk-bar" style={{ gridColumn: `${x.from + 2} / ${x.to + 3}`, gridRow: i + 2 }} />
                    </div>
                  ))}
                  {grid.steps.map((x, i) => (
                    <div key={`s-${x.title}`} style={{ display: "contents" }}>
                      <div className="rk-gl" style={{ gridColumn: 1, gridRow: grid.tasks.length + i + 2 }}><strong>{t("risks.new")}</strong> {x.title}</div>
                      <div className="rk-bar rk-new" style={{ gridColumn: `${x.from + 2} / ${x.to + 3}`, gridRow: grid.tasks.length + i + 2 }} />
                    </div>
                  ))}
                </div>
              </div>
            )}
            <p className="meta">{t("risks.timelineHint")}</p>
          </section>
          <form id="rk-accept" action={actions.accept} className="surface rk-card" aria-labelledby="rk-own">
            <input type="hidden" name="id" value={risk.id} />
            <h2 id="rk-own">{t("risks.ownersTitle")}</h2>
            <ul className="rk-steps">
              {open.map((s) => {
                const who = name(s.ownerId);
                const load = loads[s.id] ?? 0;
                return (
                  <li key={s.id}>
                    <label className="rk-tick">
                      <input type="checkbox" name="stepId" value={s.id} defaultChecked={!s.gapNote} />
                      <span className="rk-card-top"><strong>{s.title}</strong>
                        {who ? <span className="rk-who"><span className="rk-av" aria-hidden="true">{who.name.charAt(0).toUpperCase()}</span>{who.name} · {t(`risks.role.${who.role}` as MessageKey)} <span className={`st st-${load === 0 ? "ok" : load >= 75 ? "bad" : "warn"}`}>{load === 0 ? t("risks.free") : t("risks.booked").replace("{n}", String(load))}</span></span> : <span className="st st-bad">{t("risks.noOwner")}</span>}
                      </span>
                    </label>
                    <p className="meta">{label(s)}{s.reason ? ` · ${s.reason}` : ""}</p>
                    {s.gapNote && <p className="rk-gap">{s.gapNote}</p>}
                    {s.gapNote && (
                      <Choice name={`owner:${s.id}`} label={t("risks.assignInstead")} value="" options={[{ value: "", label: t("risks.keepGap") }, ...people.filter((p) => p.role !== "contributor").map((p) => ({ value: p.userId, label: p.name }))]} />
                    )}
                  </li>
                );
              })}
            </ul>
          </form>
        </>
      )}
      {steps.some((s) => s.status === "accepted") && (
        <section className="surface rk-card" aria-labelledby="rk-done">
          <h2 id="rk-done">{t("risks.step.accepted")}</h2>
          <ul className="rk-steps">{steps.filter((s) => s.status === "accepted").map((s) => <li key={s.id}><div className="rk-card-top"><strong>{s.title}</strong><span className="st st-ok">{t("risks.step.accepted")}</span></div><p className="meta">{label(s)} · {name(s.ownerId)?.name ?? t("risks.noOwner")}</p></li>)}</ul>
        </section>
      )}
    </main>
  );
}
