import { supabaseServer } from "@/auth/supabase";
import { listAuditPage } from "@/data/live";
import { currentProject, listProjects } from "@/data/projects";
import { parseAuditFilters } from "@/domain/audit";
import { filterParams } from "@/domain/filters";
import { MoreLink } from "@/app/app/MoreLink";
import { intlLocale } from "@/lib/messages";
import { getLocale, getT } from "@/lib/locale";

export default async function AuditPage({ searchParams }: { searchParams: Promise<{ project?: string; after?: string; from?: string; to?: string; action?: string }> }) {
  const t = await getT();
  const locale = await getLocale();
  const supabase = await supabaseServer();
  const sp = await searchParams;
  const { project: chosen, after } = sp;
  const filters = parseAuditFilters(sp);
  const project = currentProject(await listProjects(supabase), chosen);
  if (!project) return <main id="main" className="page"><p>{t("projects.empty")}</p></main>;
  // Only project managers and workspace admins can read the log; everyone else sees no rows.
  const { rows, next } = await listAuditPage(supabase, project.id, after, filters);
  return (
    <main id="main" className="page">
      <p className="eyebrow">{project.name}</p>
      <h1>{t("audit.title")}</h1>
      <p className="intro">{t("audit.intro")}</p>
      <form action="/app/audit" method="get" role="search">
        <input type="hidden" name="project" value={project.id} />
        <label>{t("filter.from")} <input type="date" name="from" defaultValue={filters.from} /></label>{" "}
        <label>{t("filter.to")} <input type="date" name="to" defaultValue={filters.to} /></label>{" "}
        <label>{t("audit.action")} <input type="text" name="action" defaultValue={filters.action} maxLength={60} /></label>{" "}
        <button type="submit">{t("filter.apply")}</button>{" "}
        <a href={`/app/audit?project=${project.id}`}>{t("filter.clear")}</a>
      </form>
      <p><a className="btn btn-secondary" href={`/app/audit/csv?${new URLSearchParams({ project: project.id, ...filterParams(filters) })}`} download>{t("audit.download")}</a></p>
      {rows.length === 0 ? (
        <p>{t("audit.empty")}</p>
      ) : (
        <div className="surface data-table">
        <table>
          <caption className="sr-only">{t("audit.title")}</caption>
          <thead>
            <tr><th scope="col">{t("audit.when")}</th><th scope="col">{t("audit.action")}</th><th scope="col">{t("audit.item")}</th><th scope="col">{t("audit.who")}</th></tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>{new Date(r.created_at).toLocaleString(intlLocale[locale])}</td>
                <td>{r.action}</td>
                <td>{r.entity_type}</td>
                <td>{r.actor_id ?? ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      )}
      <MoreLink path="/app/audit" params={{ project: project.id, ...filterParams(filters) }} next={next} label={t("paging.more")} />
    </main>
  );
}
