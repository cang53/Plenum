import { supabaseServer } from "@/auth/supabase";
import { currentProject, listNotifications, listProjects } from "@/data/projects";
import { notificationHref } from "@/domain/notifications";
import { MoreLink } from "@/app/app/MoreLink";
import { intlLocale } from "@/lib/messages";
import { getLocale, getT } from "@/lib/locale";
import { markAllRead, saveDigest } from "./actions";

export default async function NotificationsPage({ searchParams }: { searchParams: Promise<{ project?: string; after?: string }> }) {
  const t = await getT();
  const locale = await getLocale();
  const supabase = await supabaseServer();
  const { project: chosen, after } = await searchParams;
  const project = currentProject(await listProjects(supabase), chosen);
  if (!project) return <main id="main" className="page"><p>{t("projects.empty")}</p></main>;
  const { rows, next } = await listNotifications(supabase, project.id, after);
  const { data: { user } } = await supabase.auth.getUser();
  const { data: me } = await supabase.from("profiles").select("digest_daily, digest_suggestions, digest_due").eq("id", user?.id ?? "").maybeSingle();
  return (
    <main id="main" className="page">
      <p className="eyebrow">{project.name}</p>
      <h1>{t("notifications.title")}</h1>
      <p className="intro">{t("notifications.intro")}</p>
      <form action={saveDigest} className="surface">
        <h2>{t("digest.heading")}</h2>
        <p><label><input type="checkbox" name="digest" defaultChecked={me?.digest_daily ?? false} /> {t("digest.label")}</label></p>
        <p><label><input type="checkbox" name="suggestions" defaultChecked={me?.digest_suggestions ?? true} /> {t("digest.partSuggestions")}</label></p>
        <p><label><input type="checkbox" name="due" defaultChecked={me?.digest_due ?? true} /> {t("digest.partDue")}</label></p>
        <button type="submit" className="btn btn-primary">{t("digest.save")}</button>
      </form>
      {rows.length === 0 ? <p>{t("notifications.empty")}</p> : (
        <>
          <form action={markAllRead}>
            <input type="hidden" name="projectId" value={project.id} />
            <button type="submit" className="btn btn-secondary">{t("notifications.markRead")}</button>
          </form>
          <ul className="surface notice-list">
            {rows.map((n) => (
              <li key={n.id}>
                {!n.read && <span className="badge badge-info">{t("notifications.new")}</span>}
                <a href={notificationHref(n.kind, project.id)}>{t(`notifications.${n.kind}`)}: {n.subject}</a>{" "}
                <time dateTime={n.createdAt}>{new Date(n.createdAt).toLocaleString(intlLocale[locale])}</time>
              </li>
            ))}
          </ul>
          <MoreLink path="/app/notifications" params={{ project: project.id }} next={next} label={t("paging.more")} />
        </>
      )}
    </main>
  );
}
