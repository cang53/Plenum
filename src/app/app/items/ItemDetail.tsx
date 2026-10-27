import type { ManualItem } from "@/data/live";
import { ConfirmDialog } from "@/app/app/ConfirmDialog";
import type { MessageKey } from "@/lib/messages";
import { addItemNote, deleteItem, toggleRisk } from "./actions";
import { CopyLink } from "./CopyLink";
import type { Source } from "./ItemFields";

type T = (key: MessageKey) => string;
export type Activity = { at: string; text: string; href?: string };
type Props = {
  t: T;
  locale: string;
  item: ManualItem;
  key_?: string;
  shareHref: string;
  owner?: string;
  phase?: string;
  source?: Source;
  activity: Activity[];
  canManage: boolean;
  closeHref: string;
  editHref: string;
  hoursHref?: string;
};

// Read-only inspector for one task, decision or risk: properties, source, activity, a note box, and the manager actions.
export function ItemDetail({ t, locale, item, key_ = "", shareHref, owner, phase, source, activity, canManage, closeHref, editHref, hoursHref }: Props) {
  const day = (d: string | null) => (d ? new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(d)) : t("items.none"));
  const stamp = new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "UTC" });
  const prop = (label: string, value: string) => <div key={label}><dt>{label}</dt><dd>{value || t("items.none")}</dd></div>;
  const kind = item.kind;
  const heading = t(`items.detail.${kind}` as MessageKey);
  const hidden = <><input type="hidden" name="kind" value={kind} /><input type="hidden" name="id" value={item.id} /></>;
  return (
    <aside className="item-inspector item-detail" aria-label={heading}>
      <header className="insp-head insp-bar">
        <a className="insp-close" href={closeHref} aria-label={t("taskDetail.close")}>✕</a>
        <h2>{heading}</h2>
        {canManage && <a className="btn btn-secondary" href={editHref}>{t(`items.edit.${kind}` as MessageKey)}</a>}
      </header>
      <div className="insp-body insp-read">
        <section className="wide">
          <p className="insp-id">{key_}</p>
          <h3 className="insp-title">{item.title}</h3>
          <p className="insp-text">{item.details || t("taskDetail.noDetails")}</p>
        </section>
        {kind === "task" && (
          <dl className="wide insp-props">
            {prop(t("items.owner"), owner ?? "")}{prop(t("items.phase"), phase ?? "")}
            {prop(t("items.start"), item.startDate ? day(item.startDate) : "")}{prop(t("board.due"), item.dueDate ? day(item.dueDate) : "")}
            {prop(t("board.statusLabel"), t(`status.${item.status}` as MessageKey))}{prop(t("items.priority"), item.priority ? t(`priority.${item.priority}` as MessageKey) : "")}
            {prop(t("items.costCode"), item.costCode)}{prop(t("items.site"), item.site)}
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
            <p className="insp-card-label">{t("items.source")}</p>
            <p><a href={source.href}>{source.subject || t("taskDetail.sourceMessage")}</a></p>
            <p className="insp-card-note">{[source.from, source.receivedAt.slice(0, 10)].filter(Boolean).join(" · ")}</p>
          </section>
        )}
        <p className="wide insp-card-note">{t("items.createdOn").replace("{date}", day(item.createdAt.slice(0, 10)))}</p>
        {source?.review && (
          <section className="wide insp-card insp-review" aria-label={t("items.reviewTitle")}>
            <p className="insp-card-label">{t("items.reviewTitle")}</p>
            <p>{source.review.title}</p>
            <p className="insp-card-note">{t("items.pendingHelp")}</p>
            <a className="btn btn-secondary" href={source.review.href}>{t("items.reviewLink")} ↗</a>
          </section>
        )}
        <section className="wide" aria-label={t("taskDetail.activity")}>
          <h3 className="insp-sub">{t("taskDetail.activity")}</h3>
          <ul className="td-list insp-activity">
            {activity.map((a, i) => <li key={i}><span className="sub">{stamp.format(new Date(a.at))}</span> {a.text}{a.href && <> · <a href={a.href}>{t("taskDetail.sourceMessage")}</a></>}</li>)}
            {!activity.length && <li className="sub">{t("items.noActivity")}</li>}
          </ul>
        </section>
        <form action={addItemNote} className="wide insp-note">
          {hidden}
          <label>{t("items.noteLabel")}<textarea name="note" required maxLength={2000} /></label>
          <div className="insp-actions">
            {kind === "task" && hoursHref && <a className="btn btn-secondary" href={hoursHref}>{t("items.logHours")}</a>}
            <button type="submit" className="btn btn-primary">{t("items.addNote")} ↑</button>
          </div>
        </form>
      </div>
      {canManage && (
        <footer className="insp-foot">
          <CopyLink href={shareHref} label={t("items.copyLink")} done={t("items.linkCopied")} failed={t("items.copyFailed")} />
          <ConfirmDialog trigger={t("items.delete")} title={t("items.deleteTitle")} body={item.title} cancel={t("ui.dialog.cancel")}>
            <form action={deleteItem}>{hidden}<input type="hidden" name="back" value={closeHref} /><button className="btn btn-primary">{t("items.deleteConfirm")}</button></form>
          </ConfirmDialog>
        </footer>
      )}
    </aside>
  );
}
