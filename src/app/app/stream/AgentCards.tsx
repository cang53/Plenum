import { applySuggestion, dismissSuggestionForm, resolveAgentAction, undoAgentAction } from "./actions";
import { isoWeek, shiftDays } from "@/domain/riskPlan";
import type { AgentProposal } from "@/domain/agent";
import type { StoredSuggestion } from "@/domain/triage";
import type { MessageKey } from "@/lib/messages";

// What a card needs from its page: the words, the time formats, whether this person may decide, and the message it is based on.
export type Ctx = { t: (key: MessageKey) => string; time: Intl.DateTimeFormat; date: Intl.DateTimeFormat; canPin: boolean; readOnly?: boolean; projectId: string };
export type Source = { id: string; who: string; at: string };

// What a proposed date change does to the timeline: the old dates in grey, the proposal hatched, green once accepted. One column per day.
const DAY_MS = 86_400_000;
export function Impact({ a, label, before, after, done }: { a: AgentProposal; label: string; before: string; after: string; done: boolean }) {
  if (a.kind === "add_dependency" || !a.dueDate) return null;
  const span = (s: string | null, d: string | null) => (d ? { start: s ?? d, due: d } : null);
  const now = span(a.startDate, a.dueDate)!;
  const was = a.before ? span(a.before.startDate, a.before.dueDate) : null;
  const all = [now, ...(was ? [was] : [])];
  const first = all.map((x) => x.start).sort()[0];
  const last = all.map((x) => x.due).sort().reverse()[0];
  const day = (d: string) => Math.round((Date.parse(d) - Date.parse(first)) / DAY_MS);
  const n = day(last) + 1;
  if (n < 1 || n > 120) return null;
  const weeks = Array.from({ length: n }, (_, i) => shiftDays(first, i)).flatMap((d, i) => (i === 0 || new Date(`${d}T00:00:00Z`).getUTCDay() === 1 ? [{ i, w: isoWeek(d) }] : []));
  const cols = { gridTemplateColumns: `repeat(${n}, 1fr)` };
  const lane = (x: { start: string; due: string } | null, name: string, cls: string) => (
    <div className="impact-lane"><span>{name}</span><div className="impact-track" style={cols}>{x && <i className={cls} style={{ gridColumn: `${day(x.start) + 1} / ${day(x.due) + 2}` }} />}</div></div>
  );
  return (
    <div className="impact" role="img" aria-label={label}>
      <div className="impact-lane impact-weeks"><span /><div className="impact-track" style={cols}>{weeks.map((x) => <b key={x.i} style={{ gridColumn: `${x.i + 1} / ${n + 1}`, justifySelf: "start", gridRow: 1 }}>W{x.w}</b>)}</div></div>
      {was && lane(was, before, "was")}
      {lane(now, after, done ? "now done" : "now")}
    </div>
  );
}

// CobIA's suggestion of one item, and its proposal to change the plan. A person always decides, and each links to its source message.
export function SuggestionBubble({ ctx, sg, source }: { ctx: Ctx; sg: StoredSuggestion; source: Source }) {
  const { t, time, canPin, readOnly } = ctx;
  return (

  <div className="bubble">
    <p className="agent-tag">{t("stream.agent")} · {t(sg.riskKind ? (`risks.kind.${sg.riskKind}` as "risks.kind.risk") : `stream.linked.${sg.kind}`)}</p>
    <p className="agent-title">{sg.title}</p>
    {sg.details && <p className="agent-details">{sg.details}</p>}
    {sg.riskKind && <p className="agent-details">{t("risks.likelihood")} {sg.likelihood}/5 · {t("risks.severityShort")} {sg.severity}/5</p>}
    <p className="from">{t("stream.basedOn")} <a href={`#msg-${source.id}`}>{source.who}, {time.format(new Date(source.at))}</a></p>
    <div className="agent-acts agent-foot">
      <form action={applySuggestion}>
        {["id", "kind", "title", "details", "riskKind", "likelihood", "severity"].map((k) => sg[k as "kind"] !== undefined && <input key={k} type="hidden" name={k} value={k === "id" ? sg.id : String(sg[k as "kind"])} />)}
        <button type="submit" disabled={readOnly || !canPin} title={canPin ? undefined : t("inbox.managersOnly")} className="btn btn-primary">{t("stream.apply")}</button>
      </form>
      <details className="edit-pop">
        <summary className="btn btn-secondary">{t("stream.edit")}</summary>
        <form action={applySuggestion}>
          <input type="hidden" name="id" value={sg.id} />
          <input type="hidden" name="kind" value={sg.kind} />
          <input name="title" defaultValue={sg.title} aria-label={t("stream.editTitle")} required />
          <input name="details" defaultValue={sg.details} aria-label={t("stream.editDetails")} />
          {sg.riskKind && (
            <>
              <select name="riskKind" defaultValue={sg.riskKind} aria-label={t("stream.editType")}>
                {["risk", "issue"].map((k) => <option key={k} value={k}>{t(k === "issue" ? "risks.kind.issue" : "risks.kind.risk")}</option>)}
              </select>
              <input name="likelihood" type="number" min={1} max={5} defaultValue={sg.likelihood} aria-label={t("risks.likelihood")} required />
              <input name="severity" type="number" min={1} max={5} defaultValue={sg.severity} aria-label={t("risks.severityShort")} required />
            </>
          )}
          <button type="submit" disabled={readOnly || !canPin} title={canPin ? undefined : t("inbox.managersOnly")} className="btn btn-primary">{t("stream.apply")}</button>
        </form>
      </details>
      <form action={dismissSuggestionForm}>
        <input type="hidden" name="id" value={sg.id} />
        <button type="submit" disabled={readOnly || !canPin} title={canPin ? undefined : t("inbox.managersOnly")} className="btn btn-secondary">{t("stream.dismiss")}</button>
      </form>
    </div>
  </div>
  );
}

export function ActionBubble({ ctx, a, source }: { ctx: Ctx; a: AgentProposal; source: Source }) {
  const { t, time, date, canPin, readOnly, projectId } = ctx;
  return (

  <div className="bubble">
    <p className="agent-tag">{t("stream.agent")} · {t(`stream.agent.${a.kind}`)}</p>
    <p className="agent-title">{a.title}</p>
    {a.details && <p className="agent-details">{a.details}</p>}
    {a.kind !== "add_dependency" && a.before && <p className="agent-details">{t("stream.before")}: {a.before.startDate ?? "–"} → {a.before.dueDate ?? "–"}</p>}
    {a.kind !== "add_dependency" && <p className="agent-details">{a.before ? `${t("stream.after")}: ` : ""}{a.startDate ?? "–"} → {a.dueDate ?? "–"}</p>}
    <Impact a={a} label={t("stream.impact")} before={t("stream.before")} after={t("stream.after")} done={!!a.accepted} />
    <p className="from">{t("stream.basedOn")} <a href={`#msg-${source.id}`}>{source.who}, {time.format(new Date(source.at))}</a> · {a.reason}</p>
    {a.accepted ? (
      <div className="agent-foot" title={`${t("stream.acceptedBy")} ${a.accepted.by} · ${date.format(new Date(a.accepted.at))} ${time.format(new Date(a.accepted.at))}`}>
        <svg className="ok" viewBox="0 0 24 24" width="15" height="15" aria-hidden="true"><path d="M2 13l5 5L18 6M12 16l2 2L23 6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
        <p className="agent-done">{t(`stream.done.${a.kind}`)} · {`${t("stream.acceptedBy")} ${a.accepted.by} · ${date.format(new Date(a.accepted.at))} ${time.format(new Date(a.accepted.at))}`}</p>
        <form action={undoAgentAction}>
          <input type="hidden" name="id" value={a.id} />
          <button type="submit" disabled={readOnly || !canPin} title={canPin ? undefined : t("inbox.managersOnly")} className="btn btn-danger">{t("stream.undo")}</button>
        </form>
        <a className="go" href={`/app/items?project=${projectId}`} aria-label={t("stream.openItems")} title={t("stream.openItems")}>
          <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M3 12h17M14 5l7 7-7 7" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </a>
      </div>
    ) : (
      <div className="agent-acts agent-foot">
        {[["1", "stream.apply", "btn btn-primary"], ["0", "stream.dismiss", "btn btn-secondary"]].map(([accept, label, cls]) => (
          <form key={accept} action={resolveAgentAction}>
            <input type="hidden" name="id" value={a.id} />
            <input type="hidden" name="accept" value={accept} />
            <button type="submit" disabled={readOnly || !canPin} title={canPin ? undefined : t("inbox.managersOnly")} className={cls}>{t(label as MessageKey)}</button>
          </form>
        ))}
      </div>
    )}
  </div>
  );
}
