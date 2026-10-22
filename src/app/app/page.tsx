import { redirect } from "next/navigation";
import { supabaseServer } from "@/auth/supabase";
import { currentProject, listProjects } from "@/data/projects";
import { getT } from "@/lib/locale";

export default async function AppHome({ searchParams }: { searchParams: Promise<{ project?: string }> }) {
  const t = await getT();
  const supabase = await supabaseServer();
  const { data } = await supabase.auth.getUser();
  const projects = await listProjects(supabase);
  // Invited people already have projects; everyone else starts with the wizard.
  if (projects.length === 0) redirect("/app/welcome");
  const current = currentProject(projects, (await searchParams).project);
  return (
    <main id="main" className="home">
      <h1>{t("app.signedIn")}</h1>
      <p>{data.user?.email}</p>
      <nav aria-label={t("projects.title")}>
        <h2>{t("projects.title")}</h2>
        {projects.length === 0 ? (
          <p>{t("projects.empty")}</p>
        ) : (
          <ul>
            {projects.map((p) => (
              <li key={p.id}>
                <a href={`/app?project=${p.id}`} aria-current={p.id === current?.id ? "page" : undefined}>
                  {p.name}
                </a>
              </li>
            ))}
          </ul>
        )}
      </nav>
      {current && (
        <nav aria-label={t("app.pages")}>
          <ul className="nav-links">
            <li><a href={`/app/board?project=${current.id}`}>{t("app.board")}</a></li>
            <li><a href={`/app/timeline?project=${current.id}`}>{t("app.timeline")}</a></li>
            <li><a href={`/app/items?project=${current.id}`}>{t("app.items")}</a></li>
            <li><a href={`/app/audit?project=${current.id}`}>{t("app.audit")}</a></li>
            <li><a href={`/app/members?project=${current.id}`}>{t("app.members")}</a></li>
            <li><a href="/app/roles">{t("app.roles")}</a></li>
            <li><a href={`/app/notifications?project=${current.id}`}>{t("app.notifications")}</a></li>
            <li><a href={`/app/search?project=${current.id}`}>{t("app.search")}</a></li>
            <li><a href={`/app/settings?project=${current.id}`}>{t("app.settings")}</a></li>
          </ul>
        </nav>
      )}
      <form action="/auth/signout" method="post">
        <button type="submit">{t("app.signOut")}</button>
      </form>
    </main>
  );
}
