import { supabaseServer } from "@/auth/supabase";
import { listAuditPage } from "@/data/live";
import { currentProject, listProjects } from "@/data/projects";
import { MoreLink } from "@/app/app/MoreLink";
import { intlLocale } from "@/lib/messages";
import { getLocale, getT } from "@/lib/locale";

export default async function AuditPage({ searchParams }: { searchParams: Promise<{ project?: string; after?: string }> }) {
  const t = await getT();
  const locale = await getLocale();
  const supabase = await supabaseServer();
  const { project: chosen, after } = await searchParams;
  const project = currentProject(await listProjects(supabase), chosen);
  if (!project) return <main id="main" className="page"><p>{t("projects.empty")}</p></main>;
  // Only project managers and workspace admins can read the log; everyone else sees no rows.
  const { rows, next } = await listAuditPage(supabase, project.id, after);
  return (
    <main id="main" className="page">
      <p className="eyebrow">{project.name}</p>
      <h1>{t("audit.title")}</h1>
      <p className="intro">{t("audit.intro")}</p>
      <p><a className="btn btn-secondary" href={`/app/audit/csv?project=${project.id}`} download>{t("audit.download")}</a></p>
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
      <MoreLink path="/app/audit" params={{ project: project.id }} next={next} label={t("paging.more")} />
    </main>
  );
}
