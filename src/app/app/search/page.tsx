import { supabaseServer } from "@/auth/supabase";
import { currentProject, listProjects, searchProject } from "@/data/projects";
import { searchHref, snippetParts } from "@/domain/search";
import { MoreLink } from "@/app/app/MoreLink";
import { getT } from "@/lib/locale";

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ project?: string; q?: string; after?: string; since?: string; until?: string; task?: string }> }) {
  const t = await getT();
  const supabase = await supabaseServer();
  const { project: chosen, q = "", after, since = "", until = "", task = "" } = await searchParams;
  const project = currentProject(await listProjects(supabase), chosen);
  if (!project) return <main id="main" className="page"><p>{t("projects.empty")}</p></main>;
  const query = q.trim();
  const { rows: hits, next } = query ? await searchProject(supabase, project.id, query, after, { since, until, task }) : { rows: [], next: null };
  return (
    <main id="main" className="page">
      <p className="eyebrow">{project.name}</p>
      <h1>{t("search.title")}</h1>
      <form action="/app/search" method="get" role="search">
        <input type="hidden" name="project" value={project.id} />
        <label>
          {t("search.label")} <input type="search" name="q" defaultValue={query} maxLength={200} />
        </label>{" "}
        <label>
          {t("search.since")} <input type="date" name="since" defaultValue={since} />
        </label>{" "}
        <label>
          {t("search.until")} <input type="date" name="until" defaultValue={until} />
        </label>{" "}
        {task && <input type="hidden" name="task" value={task} />}
        <button type="submit">{t("search.submit")}</button>
      </form>
      {query && hits.length === 0 && <p>{t("search.empty")}</p>}
      <ul>
        {hits.map((h) => (
          <li key={`${h.kind}-${h.id}`}>
            <a href={searchHref(project.id, h.kind)}>{t(`search.${h.kind}`)}: {h.title}</a>
            {h.snippet && (
              <p>
                {snippetParts(h.snippet).map((x, i) => (x.match ? <mark key={i}>{x.text}</mark> : x.text))}
              </p>
            )}
          </li>
        ))}
      </ul>
      <MoreLink path="/app/search" params={{ project: project.id, q: query, since, until, task }} next={next} label={t("paging.more")} />
    </main>
  );
}
