import { supabaseServer } from "@/auth/supabase";
import { currentProject, listNotifications, listProjects } from "@/data/projects";
import { notificationHref } from "@/domain/notifications";
import { intlLocale } from "@/lib/messages";
import { getLocale, getT } from "@/lib/locale";
import { markAllRead, saveDigest } from "./actions";

export default async function NotificationsPage({ searchParams }: { searchParams: Promise<{ project?: string }> }) {
  const t = await getT();
  const locale = await getLocale();
  const supabase = await supabaseServer();
  const project = currentProject(await listProjects(supabase), (await searchParams).project);
  if (!project) return <main id="main" className="page"><p>{t("projects.empty")}</p></main>;
  const rows = await listNotifications(supabase, project.id);
  const { data: { user } } = await supabase.auth.getUser();
  const { data: me } = await supabase.from("profiles").select("digest_daily").eq("id", user?.id ?? "").maybeSingle();
  return (
    <main id="main" className="page">
      <p className="eyebrow">{project.name}</p>
      <h1>{t("notifications.title")}</h1>
      <p className="intro">{t("notifications.intro")}</p>
      <form action={saveDigest}>
        <label><input type="checkbox" name="digest" defaultChecked={me?.digest_daily ?? false} /> {t("digest.label")}</label>{" "}
        <button type="submit">{t("digest.save")}</button>
      </form>
      {rows.length === 0 ? <p>{t("notifications.empty")}</p> : (
        <>
          <form action={markAllRead}>
            <input type="hidden" name="projectId" value={project.id} />
            <button type="submit">{t("notifications.markRead")}</button>
          </form>
          <ul>
            {rows.map((n) => (
              <li key={n.id}>
                {!n.read && <strong>{t("notifications.new")} </strong>}
                <a href={notificationHref(n.kind, project.id)}>{t(`notifications.${n.kind}`)}: {n.subject}</a>{" "}
                <time dateTime={n.createdAt}>{new Date(n.createdAt).toLocaleString(intlLocale[locale])}</time>
              </li>
            ))}
          </ul>
        </>
      )}
    </main>
  );
}
