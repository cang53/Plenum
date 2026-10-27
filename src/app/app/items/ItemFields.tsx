import { type ManualItem } from "@/data/live";
import { type Member } from "@/data/projects";
import { MANUAL_KINDS, PRIORITIES, RISK_KINDS, RISK_STATUSES } from "@/domain/items";
import { STATUSES } from "@/domain/board";
import type { MessageKey } from "@/lib/messages";
import { saveItem } from "./actions";
import { itemVersion } from "@/domain/saveState";
import { InspectorKeys } from "./InspectorKeys";
import { SaveForm, type SaveText } from "./SaveForm";
import { KindSwitch } from "./KindSwitch";

export type Plan = { members: Member[]; phases: { id: string; name: string }[]; tasks: { id: string; title: string }[] };

type Opt = [string, string];
type Labels = (key: MessageKey) => string;

// Label above a control, as in the Figma inspector.
const Field = ({ label, children, wide }: { label: string; children: React.ReactNode; wide?: boolean }) => (
  <label className={wide ? "wide" : undefined}>{label}{children}</label>
);
const Select = ({ name, value, options, none }: { name: string; value: string; options: Opt[]; none?: string }) => (
  <select name={name} defaultValue={value}>
    {none !== undefined && <option value="">{none}</option>}
    {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
  </select>
);

// The message an item came from, kept in view while it is written or edited.
function SourceCard({ source, t }: { source: Source; t: Labels }) {
  return (
    <section className="wide insp-card" aria-label={t("items.source")}>
      <p className="insp-card-label">{t("items.source")}</p>
      <p><a href={source.href}>{source.subject || t("taskDetail.sourceMessage")}</a></p>
      <p className="insp-card-note">{[source.from, source.receivedAt.slice(0, 10)].filter(Boolean).join(" · ")}</p>
    </section>
  );
}

export const saveText = (t: Labels, submit: string): SaveText => ({ cancel: t("link.cancel"), submit, saving: t("items.saving"), saveOnline: t("items.saveOnline"), offline: t("items.offline"), reconnect: t("items.reconnect"), demo: t("items.demoNotice"), failTitle: t("items.failTitle"), failBody: t("items.failBody"), keep: t("items.keepEditing"), retry: t("items.retry"), conflictTitle: t("items.conflictTitle"), conflictBody: t("items.conflictBody"), latest: t("items.latest"), review: t("items.review"), reload: t("items.reload"), reloadTitle: t("items.reloadTitle"), reloadBody: t("items.reloadBody"), reloadGo: t("items.reloadGo"), errTitle: t("items.err.title"), errDates: t("items.err.dates") });

export const discardText = (t: Labels) => ({ title: t("items.unsaved"), body: t("items.discard"), keep: t("items.keepEditing"), discard: t("items.discardGo") });

// The create/edit inspector: heading with close, scrolling body, footer with Cancel and the save button. One component for task, decision and risk.
export type Source = { id?: string; subject: string; from: string; receivedAt: string; href: string; review?: { title: string; href: string; quote?: string; meta?: string } };

export function Fields({ item, kind, projectId, project = "", closeHref = "#", reloadHref, demo = false, plan, source, draft, kindHref, t }: { item?: ManualItem; reloadHref?: string; demo?: boolean; source?: Source; draft?: { title?: string; details?: string }; kindHref?: (kind: ManualItem["kind"]) => string; kind: ManualItem["kind"]; projectId: string; project?: string; closeHref?: string; plan: Plan; t: Labels }) {
  const people: Opt[] = plan.members.map((m) => [m.userId, m.name || m.email]);
  const none = t("items.none");
  const others: Opt[] = plan.tasks.filter((o) => o.id !== item?.id).map((o) => [o.id, o.title]);
  const heading = t(`items.${item ? "edit" : "new"}.${kind}` as MessageKey);
  return (
    <SaveForm action={saveItem} text={saveText(t, t(item ? "items.save" : `items.new.${kind}` as MessageKey))} cancelHref={closeHref} reloadHref={reloadHref ?? closeHref} demo={demo} label={heading}>
      <input type="hidden" name="kind" value={kind} />
      <input type="hidden" name="projectId" value={projectId} />
      <input type="hidden" name="back" value={closeHref} />
      {item && <><input type="hidden" name="id" value={item.id} /><input type="hidden" name="base" value={itemVersion({ title: item.title, details: item.details, status: kind === "decision" ? null : item.status })} /></>}
      {!item && source?.id && <input type="hidden" name="sourceMessageId" value={source.id} />}
      <InspectorKeys closeHref={closeHref} text={discardText(t)} focusTitle={!item} />
      <header className="insp-head">
        <div><h2>{heading}</h2><p>{project}</p></div>
        <a className="insp-close" href={closeHref} aria-label={t("items.close")}>✕</a>
      </header>
      <div className="insp-body">
        {!item && <Field label={t("items.kindLabel")} wide>{kindHref ? <KindSwitch current={kind} options={MANUAL_KINDS.map((k) => ({ kind: k, label: t(`kind.${k}` as MessageKey), href: kindHref(k) }))} text={{ field: t("items.switch.field"), title: t("items.switch.title"), body: t("items.switch.body"), keep: t("items.switch.keep"), switch: t("items.switch.go"), open: t("items.switch.open") }} /> : <output className="insp-kind">{t(`kind.${kind}` as MessageKey)}</output>}</Field>}
        {!item && source && <SourceCard source={source} t={t} />}
        <Field label={`${t("link.title")} *`} wide><input name="title" required defaultValue={item?.title ?? draft?.title ?? source?.subject} /></Field>
        {kind === "task" && (
          <>
            <Field label={t("items.phase")}><Select name="phaseId" value={item?.phaseId ?? ""} options={plan.phases.map((p): Opt => [p.id, p.name])} none={none} /></Field>
            <Field label={`${t("items.parent")} · ${t("items.optional")}`}><Select name="parentId" value={item?.parentId ?? ""} options={others} none={none} /></Field>
            <Field label={t("items.owner")}><Select name="ownerId" value={item?.ownerId ?? ""} options={people} none={none} /></Field>
            <Field label={t("items.costCode")}><input name="costCode" maxLength={40} defaultValue={item?.costCode ?? ""} /></Field>
            <Field label={t("items.start")}><input type="date" name="startDate" defaultValue={item?.startDate ?? ""} /></Field>
            <Field label={t("board.due")}><input type="date" name="dueDate" defaultValue={item?.dueDate ?? ""} /></Field>
            <Field label={t("board.statusLabel")}><Select name="status" value={item?.status ?? "todo"} options={STATUSES.map((s): Opt => [s, t(`status.${s}`)])} /></Field>
            <Field label={t("items.priority")}><Select name="priority" value={item?.priority || "normal"} options={PRIORITIES.map((p): Opt => [p, t(`priority.${p}`)])} /></Field>
          </>
        )}
        <Field label={t("link.details")} wide><textarea name="details" maxLength={5000} defaultValue={item?.details ?? draft?.details} /></Field>
        {kind === "risk" && (
          <fieldset className="wide insp-state">
            <legend>{t("risk.state")}</legend>
            <div>{RISK_STATUSES.map((s) => <label key={s}><input type="radio" name="status" value={s} defaultChecked={(item?.status || "open") === s} />{t(`risk.${s}`)}</label>)}</div>
          </fieldset>
        )}
        {kind === "risk" && (
          <details className="wide insp-more">
            <summary>{t("items.more")}</summary>
            <Field label={t("risk.kindLabel")}><Select name="riskKind" value={item?.riskKind || "risk"} options={RISK_KINDS.map((k): Opt => [k, t(`kind.${k}` as MessageKey)])} /></Field>
            <Field label={t("items.owner")}><Select name="ownerId" value={item?.ownerId ?? ""} options={people} none={none} /></Field>
            <Field label={t("board.due")}><input type="date" name="dueDate" defaultValue={item?.dueDate ?? ""} /></Field>
          </details>
        )}
        {kind === "task" && (
          <details className="wide insp-more">
            <summary>{t("items.more")}</summary>
            <Field label={t("items.site")}><input name="site" maxLength={80} defaultValue={item?.site ?? ""} /></Field>
            <label className="check"><input type="checkbox" name="isMilestone" defaultChecked={item?.isMilestone ?? false} /> {t("items.milestone")}</label>
            <Field label={t("items.predecessors")} wide>
              <select name="predecessorIds" multiple defaultValue={item?.predecessorIds ?? []}>{others.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
            </Field>
          </details>
        )}
        {item && source && <SourceCard source={source} t={t} />}
        {source?.review && (
          <section className="wide insp-card insp-review" aria-label={t("items.reviewTitle")}>
            <p className="insp-card-label">{t("items.reviewTitle")}</p>
            <p>{source.review.title}</p>
            <p className="insp-card-note">{t("items.pendingHelp")}</p>
            <a className="btn btn-secondary" href={source.review.href}>{t("items.reviewLink")} ↗</a>
          </section>
        )}
      </div>
    </SaveForm>
  );
}
