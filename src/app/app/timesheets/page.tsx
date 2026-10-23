import { supabaseServer } from "@/auth/supabase";
import { listTimesheetWeeks } from "@/data/live";
import { currentProject, listProjects } from "@/data/projects";
import { getT } from "@/lib/locale";
import { messages, type MessageKey } from "@/lib/messages";
import { decideWeek, submitWeek } from "./actions";

type Search = { project?: string; done?: string; error?: string };

export default async function TimesheetsPage({ searchParams }: { searchParams: Promise<Search> }) {
  const t = await getT();
  const sp = await searchParams;
  const supabase = await supabaseServer();
  const project = currentProject(await listProjects(supabase), sp.project);
  if (!project) return <main id="main" className="page"><p>{t("projects.empty")}</p></main>;
  const [weeks, { data: role }] = await Promise.all([listTimesheetWeeks(supabase, project.id), supabase.rpc("project_role_of", { p: project.id })]);
  const manager = role === "project_manager";
  const error = sp.error && sp.error in messages.en ? t(sp.error as MessageKey) : null;
  return (
    <main id="main" className="page">
      <p className="eyebrow">{project.name}</p>
      <h1>{t("timesheets.title")}</h1>
      <p className="intro">{t("timesheets.intro")}</p>
      {error && <p role="alert" className="badge badge-danger">{error}</p>}
      {sp.done && <p role="status" className="badge badge-success">{t("timesheets.done")}</p>}
      {role && (
        <form action={submitWeek} className="surface form-card">
          <input type="hidden" name="projectId" value={project.id} />
          <button type="submit" className="btn btn-primary">{t("timesheets.submit")}</button>
        </form>
      )}
      {manager && (
        <form action="/app/timesheets/csv" method="get" className="surface form-card">
          <input type="hidden" name="project" value={project.id} />
          <label><span className="field-label">{t("timesheets.from")}</span><input className="field" type="date" name="from" required /></label>
          <label><span className="field-label">{t("timesheets.to")}</span><input className="field" type="date" name="to" required /></label>
          <p className="hint">{t("timesheets.exportHint")}</p>
          <button type="submit" className="btn">{t("timesheets.export")}</button>
        </form>
      )}
      {weeks.length === 0 ? <p>{t("timesheets.empty")}</p> : (
        <ul className="surface">
          {weeks.map((w) => (
            <li key={`${w.user_id}${w.week_start}`}>
              <h2>{w.profiles?.display_name ?? "-"} · {w.week_start}</h2>
              <p><span className="badge">{t(`timesheets.status.${w.status}` as MessageKey)}</span>{w.note && ` ${w.note}`}</p>
              {manager && w.status === "submitted" && (
                <form action={decideWeek}>
                  <input type="hidden" name="projectId" value={project.id} />
                  <input type="hidden" name="user" value={w.user_id} />
                  <input type="hidden" name="week" value={w.week_start} />
                  <label><span className="field-label">{t("timesheets.note")}</span><input className="field" name="note" maxLength={500} /></label>
                  <button type="submit" name="decision" value="approved" className="btn btn-primary">{t("timesheets.approve")}</button>
                  <button type="submit" name="decision" value="sent_back" className="btn">{t("timesheets.sendBack")}</button>
                </form>
              )}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
