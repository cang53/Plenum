import { supabaseServer } from "@/auth/supabase";
import { currentProject, listProjects } from "@/data/projects";
import { getT } from "@/lib/locale";
import { sendReport } from "./actions";

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ project?: string; error?: string }> }) {
  const t = await getT();
  const supabase = await supabaseServer();
  const { project: chosen, error } = await searchParams;
  const project = currentProject(await listProjects(supabase), chosen);
  if (!project) return <main id="main" className="page"><p>{t("projects.empty")}</p></main>;
  // Row-level security shows reports to project managers and workspace admins only.
  const { data } = await supabase.from("status_reports").select("id, week_start, body_text, sent_at").eq("project_id", project.id).order("week_start", { ascending: false }).limit(1);
  const report = data?.[0];
  return (
    <main id="main" className="page">
      <p className="eyebrow">{project.name}</p>
      <h1>{t("reports.title")}</h1>
      <p className="intro">{t("reports.intro")}</p>
      {error && <p role="alert">{t("reports.error")}</p>}
      {!report ? (
        <p>{t("reports.empty")}</p>
      ) : (
        <>
          <pre>{report.body_text}</pre>
          {report.sent_at ? (
            <p>{t("reports.sent")}</p>
          ) : (
            <form action={sendReport}>
              <input type="hidden" name="projectId" value={project.id} />
              <input type="hidden" name="reportId" value={report.id} />
              <button type="submit">{t("reports.send")}</button>
            </form>
          )}
        </>
      )}
    </main>
  );
}
