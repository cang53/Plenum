import { supabaseServer } from "@/auth/supabase";
import { currentProject, listProjects, searchProject } from "@/data/projects";
import { plainSnippet, searchHref } from "@/domain/search";
import { FilterFields } from "@/app/app/FilterFields";
import { listBoardTasks } from "@/data/live";
import { filterParams, parseFilters } from "@/domain/filters";
import { MoreLink } from "@/app/app/MoreLink";
import { getT } from "@/lib/locale";

export default async function SearchPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const t = await getT();
  const supabase = await supabaseServer();
  const raw = await searchParams;
  const { project: chosen, q = "", after } = raw;
  const filters = parseFilters(raw);
  const project = currentProject(await listProjects(supabase), chosen);
  if (!project) return <main id="main" className="page"><p>{t("projects.empty")}</p></main>;
  const query = q.trim();
  const { rows: hits, next } = query ? await searchProject(supabase, project.id, query, after, filters) : { rows: [], next: null };
  const tasks = (await listBoardTasks(supabase, project.id)).map(({ id, title }) => ({ id, title }));
  return (
    <main id="main" className="page">
      <p className="eyebrow">{project.name}</p>
      <h1>{t("search.title")}</h1>
      <form action="/app/search" method="get" role="search">
        <input type="hidden" name="project" value={project.id} />
        <label>
          {t("search.label")} <input type="search" name="q" defaultValue={query} maxLength={200} />
        </label>{" "}
        <FilterFields t={t} values={filters} tasks={tasks} />
        <button type="submit">{t("search.submit")}</button>
      </form>
      {query && hits.length === 0 && <p>{t("search.empty")}</p>}
      <ul>
        {hits.map((h) => (
          <li key={`${h.kind}-${h.id}`}>
            <a href={searchHref(project.id, h.kind)}>{t(`search.${h.kind}`)}: {h.title}</a>
            {h.snippet && <p>{plainSnippet(h.snippet)}</p>}
          </li>
        ))}
      </ul>
      <MoreLink path="/app/search" params={{ project: project.id, q: query, ...filterParams(filters) }} next={next} label={t("paging.more")} />
    </main>
  );
}
