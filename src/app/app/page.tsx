import { supabaseServer } from "@/auth/supabase";
import { currentProject, listProjects } from "@/data/projects";
import { t } from "@/lib/messages";

export default async function AppHome({ searchParams }: { searchParams: Promise<{ project?: string }> }) {
  const supabase = await supabaseServer();
  const { data } = await supabase.auth.getUser();
  const projects = await listProjects(supabase);
  const current = currentProject(projects, (await searchParams).project);
  return (
    <main className="home">
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
        <p>
          <a href={`/app/board?project=${current.id}`}>{t("app.board")}</a>{" "}
          <a href={`/app/timeline?project=${current.id}`}>{t("app.timeline")}</a>{" "}
          <a href={`/app/items?project=${current.id}`}>{t("app.items")}</a>{" "}
          <a href={`/app/audit?project=${current.id}`}>{t("app.audit")}</a>{" "}
          <a href={`/app/members?project=${current.id}`}>{t("app.members")}</a>
        </p>
      )}
      <form action="/auth/signout" method="post">
        <button type="submit">{t("app.signOut")}</button>
      </form>
    </main>
  );
}
