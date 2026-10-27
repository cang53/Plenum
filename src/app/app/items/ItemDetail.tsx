import type { ManualItem } from "@/data/live";
import { ConfirmDialog } from "@/app/app/ConfirmDialog";
import type { MessageKey } from "@/lib/messages";
import { postMessage } from "@/app/app/stream/actions";
import { deleteItem, quickUpdate, toggleRisk } from "./actions";
import { PRIORITY_ICON, STATUS_ICON } from "./ItemsTable";
import { InspectorKeys } from "./InspectorKeys";
import { CopyLink } from "./CopyLink";
import { STATUSES } from "@/domain/board";
import type { Source } from "./ItemFields";

const KIND_ICON = { task: "⊘", decision: "◇", risk: "△" } as const;

type T = (key: MessageKey) => string;
export type Activity = { at: string; text: string; href?: string };
type Rel = { title: string; href: string };
type Props = {
  t: T;
  locale: string;
  item: ManualItem;
  projectId: string;
  shareHref: string;
  owner?: string;
  phase?: string;
  parent?: Rel;
  predecessors?: Rel[];
  source?: Source;
  activity: Activity[];
  canManage: boolean;
  closeHref: string;
  editHref: string;
  hoursHref?: string;
  mine?: boolean;
  today?: string;
};

// Read-only inspector for one task, decision or risk, laid out as in Figma: toolbar, identity, properties, relationships, source, AI review, activity and replies, manager actions.
export function ItemDetail({ t, locale, item, projectId, shareHref, owner, phase, parent, predecessors = [], source, activity, canManage, closeHref, editHref, hoursHref, mine = false, today = "" }: Props) {
  const fmt = (o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat(locale, { timeZone: "UTC", ...o });
  const day = (d: string | null) => (d ? fmt({ day: "numeric", month: "short", year: "numeric" }).format(new Date(d)) : "");
  const stamp = (d: string) => fmt({ day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(d));
  const prop = (label: string, value: string) => <div key={label} className="rp"><dt>{label}</dt><dd>{value || t("items.none")}</dd></div>;
  const kind = item.kind;
  const heading = t(`items.detail.${kind}` as MessageKey);
  const hidden = <><input type="hidden" name="kind" value={kind} /><input type="hidden" name="id" value={item.id} /></>;
  const state = kind === "task" ? item.status : kind === "risk" ? item.status : "";
  const stateText = kind === "task" ? t(`status.${item.status}` as MessageKey) : kind === "risk" ? t(`risk.${item.status}` as MessageKey) : "";
  const identity = [`${KIND_ICON[kind]} ${t(`kind.${kind}` as MessageKey)}`, state && `${STATUS_ICON[state] ?? ""} ${stateText}`, kind === "task" && item.priority && `${PRIORITY_ICON[item.priority] ?? ""} ${t(`priority.${item.priority}` as MessageKey)}`].filter(Boolean).join(" · ");
  const links = (rows: Rel[]) => rows.length ? rows.map((r) => <a key={r.href} href={r.href}>{r.title} ↗</a>) : t("items.none");
  return (
    <aside className="item-inspector item-detail" aria-label={heading}>
      <InspectorKeys closeHref={closeHref} text={{ title: t("items.unsaved"), body: t("items.discard"), keep: t("items.keepEditing"), discard: t("items.discardGo") }} />
      <header className="insp-head insp-bar">
        <a className="insp-close" href={closeHref} aria-label={t("taskDetail.close")}>✕</a>
        <div><h2>{heading}</h2><p>{t("items.detail.context").replace("{role}", t(canManage ? "items.role.manager" : "items.role.member"))}</p></div>
        {canManage && <a className="btn btn-secondary" href={editHref}>{t("items.rowEdit")}</a>}
      </header>
      <div className="insp-body insp-read">
        <section className="wide insp-identity">
          <p className="insp-kindline">{identity}</p>
          <h3 className="insp-title">{item.title}</h3>
          <p className="insp-text">{item.details || t("taskDetail.noDetails")}</p>
        </section>
        {kind === "task" && (
          <dl className="wide insp-props">
            {prop(t("items.owner"), owner ?? "")}{prop(t("items.phase"), phase ?? "")}
            {prop(t("items.start"), day(item.startDate))}{prop(t("board.due"), day(item.dueDate))}
            {prop(t("items.costCode"), item.costCode)}{prop(t("items.priority"), item.priority ? `${PRIORITY_ICON[item.priority] ?? ""} ${t(`priority.${item.priority}` as MessageKey)}` : "")}
            <div className="rp full"><dt>{t("items.parentGrouping")}</dt><dd>{links(parent ? [parent] : [])}</dd></div>
            <div className="rp full"><dt>{t("items.predecessorLabel")}</dt><dd>{links(predecessors)}</dd></div>
            <p className="rel-note">{t("items.relNote")}</p>
          </dl>
        )}
        {kind === "risk" && (
          <section className="wide insp-card">
            <p className="insp-card-label">{t("risk.state")}</p>
            <p>{t(`risk.${item.status}` as MessageKey)}{item.dueDate ? ` · ${t("board.due")} ${day(item.dueDate)}` : ""}{owner ? ` · ${owner}` : ""}</p>
            {canManage && (
              <form action={toggleRisk}>
                {hidden}<input type="hidden" name="to" value={item.status === "closed" ? "open" : "closed"} />
                <button className="btn btn-secondary">{t(item.status === "closed" ? "items.reopenRisk" : "items.closeRisk")}</button>
              </form>
            )}
          </section>
        )}
        {source && (
          <section className="wide insp-card" aria-label={t("items.source")}>
            <p className="insp-card-label"><a href={source.href}>{t("items.madeFrom")} ↗</a></p>
            <p>{source.subject || t("taskDetail.sourceMessage")}</p>
            <p className="insp-card-note">{[source.from, stamp(source.receivedAt)].filter(Boolean).join(" · ")}</p>
          </section>
        )}
        <div className="wide insp-attrib"><p>{t("items.createdOn").replace("{date}", stamp(item.createdAt))}</p></div>
        {source?.review && (
          <section className="wide insp-card insp-review" aria-label={t("items.reviewTitle")}>
            <p className="insp-card-label">✧ {t("items.reviewTitle")}</p>
            <p className="strong">{source.review.title}</p>
            <a className="btn btn-secondary" href={source.review.href}>{t("items.reviewLink")} ↗</a>
            <p className="insp-card-note">{t("items.reviewNote")}</p>
          </section>
        )}
        {kind === "task" && mine && !canManage && (
          <form action={quickUpdate} className="wide insp-card insp-quick" aria-label={t("items.quick.title")}>
            <input type="hidden" name="id" value={item.id} />
            <p className="insp-card-label">{t("items.quick.title")}</p>
            <label>{t("items.quick.status")}<select name="status" defaultValue={item.status}>{STATUSES.map((x) => <option key={x} value={x}>{t(`status.${x}` as MessageKey)}</option>)}</select></label>
            <label>{t("items.noteLabel")}<textarea name="note" maxLength={2000} /></label>
            <div className="insp-pair">
              <label>{t("items.quick.hours")}<input type="number" name="hours" min="0" max="24" step="0.25" inputMode="decimal" /></label>
              <label>{t("items.quick.date")}<input type="date" name="date" defaultValue={today} /></label>
            </div>
            <button type="submit" className="btn btn-primary">{t("items.quick.save")}</button>
          </form>
        )}
        <section className="wide insp-activity-block" aria-label={t("items.activityReplies")}>
          <h3 className="insp-sub">{t("items.activityReplies")}</h3>
          {activity.map((a, i) => (
            <div key={i} className="act">
              <p className="act-text">{a.text}</p>
              <p className="insp-card-note">{stamp(a.at)}{a.href && <> · <a href={a.href}>{t("taskDetail.sourceMessage")}</a></>}</p>
            </div>
          ))}
          {!activity.length && <p className="insp-card-note">{t("items.noActivity")}</p>}
        </section>
        <form action={postMessage} className="wide insp-note">
          <input type="hidden" name="projectId" value={projectId} /><input type="hidden" name="subject" value={item.title} />
          <label>{t("items.replyLabel")}<textarea name="body" required maxLength={5000} placeholder={t("items.replyPlaceholder")} /></label>
          <div className="insp-actions">
            {kind === "task" && hoursHref && <a className="btn btn-secondary" href={hoursHref}>{t("items.logHours")}</a>}
            <button type="submit" className="btn btn-secondary">{t("items.sendReply")} ↑</button>
            <p className="insp-card-note">{owner ? t(mine ? "items.assignedYou" : "items.assignedTo").replace("{name}", owner) : t("items.replyNote")}</p>
          </div>
        </form>
      </div>
      {canManage && (
        <footer className="insp-foot insp-manage">
          <CopyLink href={shareHref} label={t("items.copyLink")} done={t("items.linkCopied")} failed={t("items.copyFailed")} />
          <ConfirmDialog trigger={t("items.delete")} title={t("items.deleteTitle")} body={`${item.title}. ${t("items.deleteBody")}`} cancel={t("ui.dialog.cancel")}>
            <form action={deleteItem}>{hidden}<input type="hidden" name="back" value={closeHref} /><button className="btn btn-primary">{t("items.deleteConfirm")}</button></form>
          </ConfirmDialog>
        </footer>
      )}
    </aside>
  );
}
