"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { startTransition, useEffect, useState } from "react";
import type { ManualItem } from "@/data/live";
import { MANUAL_KINDS } from "@/domain/items";
import { activityKey } from "@/domain/taskDetail";
import { intlLocale, t as translate, type Locale, type MessageKey } from "@/lib/messages";
import { loadActivity } from "./actions";
import { type Activity, ItemDetail } from "./ItemDetail";
import { Fields, type Plan } from "./ItemFields";
import { Notice, SaveToast } from "./Notice";
import { INSPECTOR_KEYS, listHref, softGo } from "./softNav";

export type Suggestion = { messageId: string; title: string; details: string | null; reason: string | null };
export type SourceMsg = { subject: string; from: string; receivedAt: string };
type Props = {
  locale: Locale;
  items: ManualItem[];
  plan: Plan;
  projectId: string;
  projectName: string;
  canManage: boolean;
  userId: string | null;
  sources: Record<string, SourceMsg>;
  suggestions: Suggestion[];
  fromSource?: (SourceMsg & { id: string }) | null;
  demo?: boolean;
  today: string;
  hoursHref: string;
  reviewHref: string;
  streamHref: string;
};

// Create, edit and details open from the address alone: links to the same list are caught here and only change the URL, so the panel shows at once from data already on the page.
export function InspectorHost({ locale, items, plan, projectId, projectName, canManage, userId, sources, suggestions, fromSource, demo = false, today, hoursHref, reviewHref, streamHref }: Props) {
  const t = (k: MessageKey) => translate(k, locale);
  const sp = useSearchParams();
  const router = useRouter();
  const [toast, setToast] = useState<{ kind: string; id: string } | null>(null);
  const [activity, setActivity] = useState<{ id: string; rows: Activity[] } | null>(null);
  const create = sp.get("create");
  const edit = sp.get("edit");
  const detail = sp.get("detail") ?? sp.get("task");
  const here = typeof window === "undefined" ? "" : listHref(new URL(window.location.href));
  const closeHref = (() => { const p = new URLSearchParams(sp.toString()); for (const k of INSPECTOR_KEYS) p.delete(k); return `${typeof window === "undefined" ? "/app/items" : window.location.pathname}${p.size ? `?${p}` : ""}`; })();
  const withParams = (extra: Record<string, string>) => `${closeHref}${closeHref.includes("?") ? "&" : "?"}${new URLSearchParams(extra)}`;

  // Links to this same list with only the inspector parameters changed are handled here without a page request.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const a = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || a.target || !a.closest(".items-page")) return;
      const url = new URL(a.href, location.href);
      if (url.origin !== location.origin || url.pathname !== location.pathname || listHref(url) !== listHref(new URL(location.href))) return;
      if (url.search === location.search) return;
      e.preventDefault();
      softGo(`${url.pathname}${url.search}`);
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  const openId = edit ?? detail;
  const opened = items.find((i) => i.id === openId);
  // The open row is outlined without asking the server again.
  useEffect(() => {
    document.querySelectorAll<HTMLElement>("tr[data-id]").forEach((r) => { r.classList.toggle("sel", r.dataset.id === openId); r.ariaSelected = String(r.dataset.id === openId); });
  }, [openId]);
  // Task activity is the one thing not already on the page; the panel opens first and fills in.
  const wanted = opened?.kind === "task" && !edit ? opened.id : null;
  useEffect(() => {
    if (!wanted) return;
    let live = true;
    loadActivity(wanted).then((rows) => live && setActivity({ id: wanted, rows: rows.map((a) => ({ at: a.at, who: a.who ?? t("taskDetail.someone"), text: t(activityKey(a.action)), href: a.messageId ? `${streamHref}#msg-${a.messageId}` : undefined })) })).catch(() => {});
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wanted]);

  const onSaved = (r: { kind: string; id: string }) => {
    setToast(r);
    softGo(closeHref);
    startTransition(() => router.refresh());
  };
  const sourceFor = (i: ManualItem) => {
    const s = i.sourceMessageId ? sources[i.sourceMessageId] : undefined;
    if (!s || !i.sourceMessageId) return undefined;
    const sug = suggestions.find((x) => x.messageId === i.sourceMessageId);
    return { ...s, id: i.sourceMessageId, href: `${streamHref}#msg-${i.sourceMessageId}`, review: sug ? { title: sug.title, quote: sug.details || sug.reason || undefined, meta: [s.from, s.receivedAt.slice(11, 16)].filter(Boolean).join(" · "), href: reviewHref } : undefined };
  };
  const common = { projectId, project: projectName, closeHref, plan, t, onSaved, demo };
  const kind = MANUAL_KINDS.find((k) => k === create);
  void here;
  return (
    <>
      {toast && <SaveToast title={t("items.saved")} href={withParams({ detail: toast.id })} link={t("items.viewItem")} />}
      {!canManage && <Notice tone="info" title={t("items.readonlyTitle")} body={t("items.readonlyBody")} />}
      {kind && <Fields key={`create-${kind}`} kind={kind} {...common} draft={{ title: sp.get("title") ?? undefined, details: sp.get("details") ?? undefined }} kindHref={(other) => withParams({ create: other, ...(sp.get("from") ? { from: sp.get("from")! } : {}) })} source={fromSource ? { ...fromSource, href: `${streamHref}#msg-${fromSource.id}` } : undefined} />}
      {opened && edit && canManage && <Fields key={`edit-${opened.id}`} item={opened} kind={opened.kind} {...common} reloadHref={withParams({ edit: opened.id })} source={sourceFor(opened)} />}
      {opened && edit && !canManage && (
        <Notice tone="warn" title={t("items.deniedTitle")} body={t("items.deniedBody")}>
          <a className="btn btn-secondary" href={withParams({ detail: opened.id })}>{t("items.viewItem")}</a>
          <a className="btn btn-primary" href={closeHref}>{t("items.back")}</a>
        </Notice>
      )}
      {opened && !edit && (
        <ItemDetail key={opened.id} t={t} locale={intlLocale[locale]} projectId={projectId} item={opened} shareHref={withParams({ detail: opened.id })} owner={opened.ownerId ? plan.members.find((m) => m.userId === opened.ownerId)?.name || plan.members.find((m) => m.userId === opened.ownerId)?.email : undefined}
          phase={plan.phases.find((p) => p.id === opened.phaseId)?.name}
          parent={opened.parentId ? { title: plan.tasks.find((x) => x.id === opened.parentId)?.title ?? "", href: withParams({ detail: opened.parentId }) } : undefined}
          predecessors={opened.predecessorIds.map((id) => ({ title: plan.tasks.find((x) => x.id === id)?.title ?? "", href: withParams({ detail: id }) }))}
          source={sourceFor(opened)} activity={activity?.id === opened.id ? activity.rows : []} canManage={canManage} closeHref={closeHref} editHref={withParams({ edit: opened.id })} hoursHref={hoursHref} mine={!!userId && opened.ownerId === userId} today={today} />
      )}
    </>
  );
}
