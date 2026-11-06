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
  const count = async (q: PromiseLike<{ count: number | null }>) => (await q).count ?? 0;
  const [total, done, openRisks] = await Promise.all([
    count(supabase.from("tasks").select("id", { count: "exact", head: true }).eq("project_id", project.id)),
    count(supabase.from("tasks").select("id", { count: "exact", head: true }).eq("project_id", project.id).eq("status", "done")),
    count(supabase.from("risks").select("id", { count: "exact", head: true }).eq("project_id", project.id).eq("status", "open")),
  ]);
  const metrics = [
    { value: `${total ? Math.round((done / total) * 100) : 0}%`, label: t("reports.metric.percent") },
    { value: String(done), label: t("reports.metric.done") },
    { value: String(openRisks), label: t("reports.metric.risks") },
  ];
  return (
    <main id="main" className="page">
      <h1 className="h1">{t("reports.title")}</h1>
      <p className="subline">{t("reports.intro")}</p>
      <div className="metrics">
        {metrics.map((m) => <div key={m.label} className="metric"><b>{m.value}</b><span className="muted">{m.label}</span></div>)}
      </div>
      {error && <p role="alert">{t("reports.error")}</p>}
      {!report ? (
        <p>{t("reports.empty")}</p>
      ) : (
        <>
          <pre className="panel">{report.body_text}</pre>
          {report.sent_at ? (
            <p>{t("reports.sent")}</p>
          ) : (
            <form action={sendReport}>
              <input type="hidden" name="projectId" value={project.id} />
              <input type="hidden" name="reportId" value={report.id} />
              <button type="submit" className="btn btn-primary">{t("reports.send")}</button>
            </form>
          )}
        </>
      )}
    </main>
  );
}
