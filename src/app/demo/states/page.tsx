import { ConfirmDialog } from "@/app/app/ConfirmDialog";
import { discardText, saveText } from "@/app/app/items/ItemFields";
import { EmptyState, ItemsSkeleton, Notice, SaveToast } from "@/app/app/items/Notice";
import { getT } from "@/lib/locale";

// Every state from the Figma sheet in one place, so each can be looked at without breaking anything. Nothing is stored.
export const dynamic = "force-dynamic";

export default async function DemoStatesPage() {
  const t = await getT();
  const x = saveText(t, t("items.save"));
  const unsaved = discardText(t);
  return (
    <main id="main" className="page items-page">
      <p className="notice">{t("gantt.demoNotice")}</p>
      <h1>{t("items.states")}</h1>
      <section aria-label={t("items.deleteTitle")}><ConfirmDialog trigger={t("items.delete")} title={t("items.deleteTitle")} body={t("items.deleteBody")} cancel={t("ui.dialog.cancel")}><button type="button" className="btn btn-primary">{t("items.deleteConfirm")}</button></ConfirmDialog></section>
      <section aria-label={unsaved.title}><ConfirmDialog trigger={unsaved.title} title={unsaved.title} body={unsaved.body} cancel={unsaved.keep}><button type="button" className="btn btn-primary">{unsaved.discard}</button></ConfirmDialog></section>
      <Notice tone="danger" title={x.errTitle} />
      <Notice tone="danger" title={x.errDates} />
      <Notice tone="danger" title={x.failTitle} body={x.failBody}><button type="button" className="btn btn-secondary">{x.keep}</button><button type="button" className="btn btn-primary">{x.retry}</button></Notice>
      <p role="status" className="saving-line"><span className="spinner" aria-hidden="true" /> {x.saving}</p>
      <SaveToast title={t("items.saved")} href="/demo/items" link={t("items.viewItem")} />
      <ItemsSkeleton label={t("items.loading")} />
      <EmptyState title={t("items.noItems")} body={t("items.noItemsHelp")} />
      <EmptyState title={t("items.noMatchTitle")} body={t("items.noMatchHelp")}><a className="btn btn-secondary" href="/demo/items">{t("items.filter.clear")}</a></EmptyState>
      <EmptyState title={t("items.loadError")} body={t("items.loadErrorHelp")}><button type="button" className="btn btn-primary">{t("app.retry")}</button></EmptyState>
      <Notice tone="info" title={t("items.readonlyTitle")} body={t("items.readonlyBody")} />
      <Notice tone="warn" title={t("items.deniedTitle")} body={t("items.deniedBody")}><a className="btn btn-secondary" href="/demo/items">{t("items.viewItem")}</a><a className="btn btn-primary" href="/demo/items">{t("items.back")}</a></Notice>
      <Notice tone="warn" title={x.offline}><button type="button" className="btn btn-secondary">{x.reconnect}</button></Notice>
      <Notice tone="warn" title={x.conflictTitle} body={x.conflictBody}><button type="button" className="btn btn-secondary">{x.review}</button><button type="button" className="btn btn-secondary">{x.reload}</button></Notice>
      <Notice tone="info" title={x.demo} />
    </main>
  );
}
