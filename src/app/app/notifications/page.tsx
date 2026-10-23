import { supabaseServer } from "@/auth/supabase";
import { currentProject, listNotifications, listProjects } from "@/data/projects";
import { notificationHref } from "@/domain/notifications";
import { MoreLink } from "@/app/app/MoreLink";
import { intlLocale } from "@/lib/messages";
import { getLocale, getT } from "@/lib/locale";
import { listInbox, listSnoozes } from "@/data/inbox";
import { awake, inboxTab, type InboxTab } from "@/domain/inbox";
import { applySuggestion, dismissSuggestionForm } from "@/app/app/stream/actions";
import { InboxKeys } from "./InboxKeys";
import { markAllRead, saveDigest, snoozeSuggestion } from "./actions";

export const dynamic = "force-dynamic";


export default async function InboxPage({ searchParams }: { searchParams: Promise<{ project?: string; after?: string; tab?: string; sel?: string }> }) {
  const t = await getT();
  const locale = intlLocale[await getLocale()];
  const supabase = await supabaseServer();
  const { project: chosen, after, tab: tabParam, sel } = await searchParams;
  const project = currentProject(await listProjects(supabase), chosen);
  if (!project) return <main id="main" className="page"><p>{t("projects.empty")}</p></main>;
  const tab = inboxTab(tabParam);
  const link = (tb: InboxTab, id?: string) => `/app/notifications?project=${project.id}&tab=${tb}${id ? `&sel=${id}` : ""}`;
  const { data: canManage } = await supabase.rpc("can_manage_project", { p: project.id });
  const items = tab === "mentions" ? [] : tab === "history" ? await listInbox(supabase, project.id, true) : awake(await listInbox(supabase, project.id, false), await listSnoozes(supabase), new Date().toISOString());
  const open = items.find((i) => i.id === sel) ?? items[0];
  const notices = tab === "mentions" ? await listNotifications(supabase, project.id, after) : null;
  const { data: { user } } = await supabase.auth.getUser();
  const { data: me } = await supabase.from("profiles").select("digest_daily, digest_suggestions, digest_due").eq("id", user?.id ?? "").maybeSingle();
  const when = (iso: string) => new Date(iso).toLocaleString(locale);
  return (
    <main id="main" className="page inbox">
      <InboxKeys />
      <h1>{t("inbox.title")}</h1>
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
            <ul className="surface notice-list">
              {notices.rows.filter((n) => n.kind !== "suggestion_new").map((n) => (
                <li key={n.id}>
                  {!n.read && <span className="badge badge-info">{t("notifications.new")}</span>}
                  <a href={notificationHref(n.kind, project.id)}>{t(`notifications.${n.kind}`)}: {n.subject}</a>{" "}
                  <time dateTime={n.createdAt}>{when(n.createdAt)}</time>
                </li>
              ))}
            </ul>
            <MoreLink path="/app/notifications" params={{ project: project.id, tab }} next={notices.next} label={t("paging.more")} />
          </>
        )
      ) : items.length === 0 ? <p>{t(tab === "history" ? "inbox.empty.history" : "inbox.empty.needs")}</p> : (
        <div className="panes">
          <ul className="list" aria-label={t(`inbox.tab.${tab}`)}>
            {items.map((i) => (
              <li key={i.id}>
                <a data-row href={link(tab, i.id)} aria-current={i.id === open?.id ? "true" : undefined}>
                  <strong>{i.title}</strong>
                  <span>{i.from} · {i.subject || t("timeline.noSubject")}</span>
                </a>
              </li>
            ))}
          </ul>
          {open && (
            <section className="detail agent-card" aria-label={t("stream.agent")}>
              <p className="agent-tag">{t("stream.agent")}</p>
              <dl className="ba">
                <dt>{t("stream.before")}</dt><dd>{open.subject || t("timeline.noSubject")}<span className="sm">{open.from} · {open.receivedAt && when(open.receivedAt)}</span><span className="body">{open.body}</span></dd>
                <dt>{t("stream.after")}</dt><dd>{t(`stream.linked.${open.kind}`)}: {open.title}{open.details && <span className="sm">{open.details}</span>}</dd>
              </dl>
              <p className="sm">{t("stream.basedOn")}: <a href={`/app/stream?project=${project.id}#msg-${open.messageId}`}>{open.subject || t("timeline.noSubject")}</a></p>
              {open.status !== "pending" ? (
                <p className="sm">{t(`inbox.did.${open.status}`).replace("{name}", open.resolvedBy || "?").replace("{date}", open.resolvedAt ? when(open.resolvedAt) : "")}</p>
              ) : !canManage ? <p className="sm">{t("inbox.managersOnly")}</p> : (
                <div className="agent-acts">
                  <form action={applySuggestion}>
                    {(["id", "kind", "title", "details"] as const).map((k) => <input key={k} type="hidden" name={k} value={open[k]} />)}
                    <button type="submit" className="btn btn-primary" data-act="apply">{t("stream.apply")} <kbd className="kbd">A</kbd></button>
                  </form>
                  <details className="edit-pop">
                    <summary className="btn btn-secondary">{t("stream.edit")}</summary>
                    <form action={applySuggestion}>
                      <input type="hidden" name="id" value={open.id} />
                      <input type="hidden" name="kind" value={open.kind} />
                      <input name="title" defaultValue={open.title} aria-label={t("stream.editTitle")} required />
                      <input name="details" defaultValue={open.details} aria-label={t("stream.editDetails")} />
                      <button type="submit" className="btn btn-primary">{t("stream.apply")}</button>
                    </form>
                  </details>
                  <form action={dismissSuggestionForm}>
                    <input type="hidden" name="id" value={open.id} />
                    <button type="submit" className="btn btn-plain" data-act="dismiss">{t("stream.dismiss")} <kbd className="kbd">D</kbd></button>
                  </form>
                  <form action={snoozeSuggestion}>
                    <input type="hidden" name="id" value={open.id} />
                    <button type="submit" className="btn btn-plain" data-act="snooze">{t("inbox.snooze")} <kbd className="kbd">H</kbd></button>
                  </form>
                </div>
              )}
            </section>
          )}
        </div>
      )}
      <form action={saveDigest} className="surface">
        <h2>{t("digest.heading")}</h2>
        <p><label><input type="checkbox" name="digest" defaultChecked={me?.digest_daily ?? false} /> {t("digest.label")}</label></p>
        <p><label><input type="checkbox" name="suggestions" defaultChecked={me?.digest_suggestions ?? true} /> {t("digest.partSuggestions")}</label></p>
        <p><label><input type="checkbox" name="due" defaultChecked={me?.digest_due ?? true} /> {t("digest.partDue")}</label></p>
        <button type="submit" className="btn btn-primary">{t("digest.save")}</button>
      </form>
    </main>
  );
}
