import { type ManualItem } from "@/data/live";
import { type Member } from "@/data/projects";
import { PRIORITIES, RISK_KINDS, RISK_STATUSES } from "@/domain/items";
import { STATUSES } from "@/domain/board";
import type { MessageKey } from "@/lib/messages";
import { saveItem } from "./actions";

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

// The create/edit inspector: heading with close, scrolling body, footer with Cancel and the save button. One component for task, decision and risk.
export function Fields({ item, kind, projectId, project = "", closeHref = "#", plan, t }: { item?: ManualItem; kind: ManualItem["kind"]; projectId: string; project?: string; closeHref?: string; plan: Plan; t: Labels }) {
  const people: Opt[] = plan.members.map((m) => [m.userId, m.name || m.email]);
  const none = t("items.none");
  const others: Opt[] = plan.tasks.filter((o) => o.id !== item?.id).map((o) => [o.id, o.title]);
  const heading = t(`items.${item ? "edit" : "new"}.${kind}` as MessageKey);
  return (
    <form action={saveItem} className="item-form item-inspector" aria-label={heading}>
      <input type="hidden" name="kind" value={kind} />
      <input type="hidden" name="projectId" value={projectId} />
      {item && <input type="hidden" name="id" value={item.id} />}
      <header className="insp-head">
        <div><h2>{heading}</h2><p>{project}</p></div>
        <a className="insp-close" href={closeHref} aria-label={t("items.close")}>✕</a>
      </header>
      <div className="insp-body">
        <Field label={t("items.kindLabel")} wide><output className="insp-kind">{t(`kind.${kind}` as MessageKey)}</output></Field>
        <Field label={`${t("link.title")} *`} wide><input name="title" required defaultValue={item?.title} /></Field>
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
        <Field label={t("link.details")} wide><textarea name="details" maxLength={5000} defaultValue={item?.details} /></Field>
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
      </div>
      <footer className="insp-foot">
        <a className="btn btn-secondary" href={closeHref}>{t("link.cancel")}</a>
        <button type="submit" className="btn btn-primary">{t(item ? "items.save" : `items.new.${kind}` as MessageKey)}</button>
      </footer>
    </form>
  );
}
