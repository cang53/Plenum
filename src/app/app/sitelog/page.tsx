import { supabaseServer } from "@/auth/supabase";
import { listSiteLogs } from "@/data/live";
import { currentProject, listProjects } from "@/data/projects";
import { getT } from "@/lib/locale";
import { messages, type MessageKey } from "@/lib/messages";
import { submitSiteLog } from "./actions";

type Search = { project?: string; saved?: string; error?: string };

export default async function SiteLogPage({ searchParams }: { searchParams: Promise<Search> }) {
  const t = await getT();
  const sp = await searchParams;
  const supabase = await supabaseServer();
  const project = currentProject(await listProjects(supabase), sp.project);
  if (!project) return <main id="main" className="page"><p>{t("projects.empty")}</p></main>;
  const [logs, { data: role }] = await Promise.all([listSiteLogs(supabase, project.id), supabase.rpc("project_role_of", { p: project.id })]);
  const canWrite = role === "member" || role === "project_manager";
  const error = sp.error && sp.error in messages.en ? t(sp.error as MessageKey) : null;
  return (
    <main id="main" className="page">
      <p className="eyebrow">{project.name}</p>
      <h1>{t("sitelog.title")}</h1>
      <p className="intro">{t("sitelog.intro")}</p>
      {error && <p role="alert" className="badge badge-danger">{error}</p>}
      {sp.saved && <p role="status" className="badge badge-success">{t("sitelog.saved")}</p>}
      {canWrite ? (
        <form action={submitSiteLog} className="surface form-card">
          <input type="hidden" name="projectId" value={project.id} />
          <p><label><span className="field-label">{t("sitelog.site")}</span><input className="field" name="site" maxLength={100} required /></label></p>
          <p><label><span className="field-label">{t("sitelog.date")}</span><input className="field" type="date" name="date" required /></label></p>
          <p><label><span className="field-label">{t("sitelog.weather")}</span><input className="field" name="weather" maxLength={100} /></label></p>
          <p><label><span className="field-label">{t("sitelog.headcount")}</span><input className="field" type="number" name="headcount" min={0} max={100000} defaultValue={0} /></label></p>
          <p><label><span className="field-label">{t("sitelog.work")}</span><textarea className="field" name="work" maxLength={4000} rows={3} /></label></p>
          <p><label><span className="field-label">{t("sitelog.delays")}</span><textarea className="field" name="delays" maxLength={4000} rows={2} /></label></p>
          <p className="hint">{t("sitelog.replaceHint")}</p>
          <button type="submit" className="btn btn-primary">{t("sitelog.save")}</button>
        </form>
      ) : <p>{t("sitelog.readOnly")}</p>}
      {logs.length === 0 ? <p>{t("sitelog.empty")}</p> : (
        <ul className="surface">
          {logs.map((l) => (
            <li key={l.id}>
              <h2>{l.site} · {l.log_date}</h2>
              <p>{t("sitelog.weather")}: {l.weather || "-"} · {t("sitelog.headcount")}: {l.headcount}</p>
              {l.work_done && <p>{l.work_done}</p>}
              {l.delays && <p>{t("sitelog.delays")}: {l.delays}</p>}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
