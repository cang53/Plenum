import type { MessageKey } from "@/lib/messages";

// The "⋯" menu at the end of a row: always Open, and Edit for people who may change the item.
export function RowOptions({ t, title, openHref, editHref }: { t: (key: MessageKey) => string; title: string; openHref: string; editHref?: string }) {
  return (
    <details className="row-opts" name="row-opts">
      <summary aria-label={`${t("items.rowOptions")}: ${title}`}>⋯</summary>
      <div className="pop" role="menu" aria-label={t("items.rowOptions")}>
        <h3>{t("items.rowOptions")}</h3>
        <p>{title}</p>
        <a className="pop-opt" role="menuitem" href={openHref}><span className="pop-check" aria-hidden="true" />{t("items.rowOpen")}</a>
        {editHref && <a className="pop-opt" role="menuitem" href={editHref}><span className="pop-check" aria-hidden="true" />{t("items.rowEdit")}</a>}
      </div>
    </details>
  );
}
