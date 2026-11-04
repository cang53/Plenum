import { supabaseServer } from "@/auth/supabase";
import { currentProject, listNotifications, listProjects } from "@/data/projects";
import { notificationHref } from "@/domain/notifications";
import { MoreLink } from "@/app/app/MoreLink";
import { intlLocale } from "@/lib/messages";
import { getLocale, getT } from "@/lib/locale";
import { listInbox, listSnoozes } from "@/data/inbox";
import { awake, groupByMessage, inboxTab, type InboxTab } from "@/domain/inbox";
import { applySuggestion, dismissSuggestionForm } from "@/app/app/stream/actions";
import { InboxKeys } from "./InboxKeys";
import { applyGroup, markAllRead, saveDigest, snoozeSuggestion } from "./actions";

export const dynamic = "force-dynamic";


export default async function InboxPage({ searchParams }: { searchParams: Promise<{ project?: string; after?: string; tab?: string}> }) {
  const t = await getT();
  const locale = intlLocale[await getLocale()];
  const supabase = await supabaseServer();
  const { project: chosen, after, tab: tabParam } = await searchParams;
  const project = currentProject(await listProjects(supabase), chosen);
  if (!project) return <main id="main" className="page"><p>{t("projects.empty")}</p></main>;
  const tab = inboxTab(tabParam);
  const link = (tb: InboxTab) => `/app/notifications?project=${project.id}&tab=${tb}`;
  const { data: canManage } = await supabase.rpc("can_manage_project", { p: project.id });
  const items = tab === "mentions" ? [] : tab === "history" ? await listInbox(supabase, project.id, true) : awake(await listInbox(supabase, project.id, false), await listSnoozes(supabase), new Date().toISOString());
  const notices = tab === "mentions" ? await listNotifications(supabase, project.id, after) : null;
  const { data: { user } } = await supabase.auth.getUser();
  const { data: me } = await supabase.from("profiles").select("digest_daily, digest_suggestions, digest_due").eq("id", user?.id ?? "").maybeSingle();
  const when = (iso: string) => new Date(iso).toLocaleString(locale);
  const groups = groupByMessage(items);
  const card = (i: (typeof items)[number]) => (
    <article key={i.id} className="icard" data-card tabIndex={0}>
      <span className="icard-ico" aria-hidden="true">✧</span>
      <div className="icard-body">
        <p className="icard-meta"><span className="icard-tag">{t("inbox.tag.suggestion")}</span><span className="icard-ai">{t("inbox.ai")}</span>{i.receivedAt && <time dateTime={i.receivedAt}>{when(i.receivedAt)}</time>}</p>
        <h3>{t(`stream.linked.${i.kind}`)}: {i.title}</h3>
        {i.details && <p className="icard-sub">{i.details}</p>}
        {i.status !== "pending" ? (
          <p className="icard-sub">{t(`inbox.did.${i.status}`).replace("{name}", i.resolvedBy || "?").replace("{date}", i.resolvedAt ? when(i.resolvedAt) : "")}</p>
        ) : !canManage ? <p className="icard-sub">{t("inbox.managersOnly")}</p> : (
          <div className="agent-acts">
            <form action={applySuggestion}>
              {(["id", "kind", "title", "details"] as const).map((k) => <input key={k} type="hidden" name={k} value={i[k]} />)}
              <button type="submit" className="btn btn-primary" data-act="apply">{t("stream.apply")} <kbd className="kbd">A</kbd></button>
            </form>
            <details className="edit-pop">
              <summary className="btn btn-secondary">{t("stream.edit")}</summary>
              <form action={applySuggestion}>
                <input type="hidden" name="id" value={i.id} />
                <input type="hidden" name="kind" value={i.kind} />
                <input name="title" defaultValue={i.title} aria-label={t("stream.editTitle")} required />
                <input name="details" defaultValue={i.details} aria-label={t("stream.editDetails")} />
                <button type="submit" className="btn btn-primary">{t("stream.apply")}</button>
              </form>
            </details>
            <form action={dismissSuggestionForm}>
              <input type="hidden" name="id" value={i.id} />
              <button type="submit" className="btn btn-plain" data-act="dismiss">{t("stream.dismiss")} <kbd className="kbd">D</kbd></button>
            </form>
            <form action={snoozeSuggestion}>
              <input type="hidden" name="id" value={i.id} />
              <button type="submit" className="btn btn-plain" data-act="snooze">{t("inbox.snooze")} <kbd className="kbd">H</kbd></button>
            </form>
          </div>
        )}
        <details className="icard-why">
          <summary>{t("inbox.why")}</summary>
          {i.reason && <p>{i.reason}</p>}
          <blockquote className="icard-quote">{i.body}</blockquote>
        </details>
      </div>
    </article>
  );
  return (
    <main id="main" className="page inbox">
      <InboxKeys />
      <div className="inbox-layout">
        <div className="inbox-main">
          <h1>{t("inbox.title")}</h1>
          <p className="intro">{t("inbox.lede")}</p>
          <nav className="tabs" aria-label={t("inbox.title")}>
            {(["needs", "mentions", "history"] as const).map((tb) => <a key={tb} href={link(tb)} aria-current={tb === tab ? "page" : undefined}>{t(`inbox.tab.${tb}`)}</a>)}
          </nav>
          {notices ? (
            notices.rows.length === 0 ? <p>{t("notifications.empty")}</p> : (
              <>
                <form action={markAllRead}>
                  <input type="hidden" name="projectId" value={project.id} />
                  <button type="submit" className="btn btn-secondary">{t("notifications.markRead")}</button>
                </form>
                <ul className="notice-list">
                  {notices.rows.filter((n) => n.kind !== "suggestion_new").map((n) => (
                    <li key={n.id} className="icard" data-card tabIndex={0}>
                      <span className="icard-ico" aria-hidden="true">@</span>
                      <div className="icard-body">
                        <p className="icard-meta">{!n.read && <span className="icard-tag">{t("notifications.new")}</span>}<time dateTime={n.createdAt}>{when(n.createdAt)}</time></p>
                        <h3><a href={notificationHref(n.kind, project.id)}>{t(`notifications.${n.kind}`)}: {n.subject}</a></h3>
                      </div>
                    </li>
                  ))}
                </ul>
                <MoreLink path="/app/notifications" params={{ project: project.id, tab }} next={notices.next} label={t("paging.more")} />
              </>
            )
          ) : items.length === 0 ? <p className="inbox-empty">{t(tab === "history" ? "inbox.empty.history" : "inbox.empty.needs")}</p> : groups.map((g) => (
            <section key={g.messageId} className="igroup" aria-label={g.items[0].subject || t("timeline.noSubject")}>
              <h2 className="igroup-head">{t("inbox.from")} <a href={`/app/stream?project=${project.id}#msg-${g.messageId}`}>{g.items[0].subject || t("timeline.noSubject")}</a><span className="igroup-line" />{canManage && g.items.length > 1 && g.items.every((i) => i.status === "pending") && (
                <form action={applyGroup}>
                  <input type="hidden" name="items" value={JSON.stringify(g.items.map(({ id, kind, title, details }) => ({ id, kind, title, details })))} />
                  <button type="submit" className="btn btn-secondary">{t("inbox.applyAll").replace("{n}", String(g.items.length))}</button>
                </form>
              )}</h2>
              {g.items.map(card)}
            </section>
          ))}
        </div>
        <aside className="inbox-side">
          <section className="surface isummary" aria-live="polite">
            <h2>{t("inbox.summary")}</h2>
            <p>{tab === "needs" && items.length ? t("inbox.summary.some").replace("{n}", String(items.length)).replace("{m}", String(groups.length)) : t("inbox.summary.none")}</p>
          </section>
          <section className="surface">
            <h2>{t("inbox.keys.title")}</h2>
            <p className="sm">{t("inbox.keys")}</p>
          </section>
          <form action={saveDigest} className="surface">
            <h2>{t("digest.heading")}</h2>
            <p><label><input type="checkbox" name="digest" defaultChecked={me?.digest_daily ?? false} /> {t("digest.label")}</label></p>
            <p><label><input type="checkbox" name="suggestions" defaultChecked={me?.digest_suggestions ?? true} /> {t("digest.partSuggestions")}</label></p>
            <p><label><input type="checkbox" name="due" defaultChecked={me?.digest_due ?? true} /> {t("digest.partDue")}</label></p>
            <button type="submit" className="btn btn-primary">{t("digest.save")}</button>
          </form>
          <p className="sm">{t("inbox.trust")}</p>
        </aside>
      </div>
    </main>
  );
}
