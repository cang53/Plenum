import { supabaseServer } from "@/auth/supabase";
import { currentProject, listNotifications, listProjects } from "@/data/projects";
import { notificationHref } from "@/domain/notifications";
import { intlLocale, t } from "@/lib/messages";
import { markAllRead } from "./actions";

export default async function NotificationsPage({ searchParams }: { searchParams: Promise<{ project?: string }> }) {
  const supabase = await supabaseServer();
  const project = currentProject(await listProjects(supabase), (await searchParams).project);
  if (!project) return <main id="main" className="page"><p>{t("projects.empty")}</p></main>;
  const rows = await listNotifications(supabase, project.id);
  return (
    <main id="main" className="page">
      <p className="eyebrow">{project.name}</p>
      <h1>{t("notifications.title")}</h1>
      <p className="intro">{t("notifications.intro")}</p>
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
                <time dateTime={n.createdAt}>{new Date(n.createdAt).toLocaleString(intlLocale.en)}</time>
              </li>
            ))}
          </ul>
        </>
      )}
    </main>
  );
}
