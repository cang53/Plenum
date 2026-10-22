import { supabaseServer } from "@/auth/supabase";
import { listAudit } from "@/data/live";
import { currentProject, listProjects } from "@/data/projects";
import { intlLocale } from "@/lib/messages";
import { getLocale, getT } from "@/lib/locale";

export default async function AuditPage({ searchParams }: { searchParams: Promise<{ project?: string }> }) {
  const t = await getT();
  const locale = await getLocale();
  const supabase = await supabaseServer();
  const project = currentProject(await listProjects(supabase), (await searchParams).project);
  if (!project) return <main id="main" className="page"><p>{t("projects.empty")}</p></main>;
  // Only project managers and workspace admins can read the log; everyone else sees no rows.
  const rows = await listAudit(supabase, project.id);
  return (
    <main id="main" className="page">
      <p className="eyebrow">{project.name}</p>
      <h1>{t("audit.title")}</h1>
      <p className="intro">{t("audit.intro")}</p>
      <p><a href={`/app/audit/csv?project=${project.id}`} download>{t("audit.download")}</a></p>
      {rows.length === 0 ? (
        <p>{t("audit.empty")}</p>
      ) : (
        <table>
          <thead>
            <tr><th scope="col">{t("audit.when")}</th><th scope="col">{t("audit.action")}</th><th scope="col">{t("audit.item")}</th><th scope="col">{t("audit.who")}</th></tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                <td>{new Date(r.created_at).toLocaleString(intlLocale[locale])}</td>
                <td>{r.action}</td>
                <td>{r.entity_type}</td>
                <td>{r.actor_id ?? ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
