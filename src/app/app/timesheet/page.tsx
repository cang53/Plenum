import { supabaseServer } from "@/auth/supabase";
import { listHours, listMyTasks, listWeekActivity } from "@/data/live";
import { currentProject, listProjects } from "@/data/projects";
import { getT } from "@/lib/locale";
import { messages, type MessageKey } from "@/lib/messages";
import { can, type ProjectRole } from "@/domain/permissions";
import { shiftWeek, weekDays, weekStart } from "@/domain/timesheet";
import { inboundConfig } from "@/server/inbound-config";
import { draftTimesheet } from "@/server/timesheetDraft";
import { aiAsk, supabaseTriageIo } from "@/server/triage-run";
import { submitHours } from "./actions";

type Search = { project?: string; week?: string; draft?: string; saved?: string; error?: string };

export default async function TimesheetPage({ searchParams }: { searchParams: Promise<Search> }) {
  const t = await getT();
  const sp = await searchParams;
  const supabase = await supabaseServer();
  const project = currentProject(await listProjects(supabase), sp.project);
  if (!project) return <main id="main" className="page"><p>{t("projects.empty")}</p></main>;
  const start = weekStart(sp.week && !Number.isNaN(Date.parse(sp.week)) ? sp.week : new Date().toISOString().slice(0, 10));
  const days = weekDays(start);
  const [{ data: { user } }, { data: role }] = await Promise.all([supabase.auth.getUser(), supabase.rpc("project_role_of", { p: project.id })]);
  const canLog = !!user && can(role as ProjectRole | null, "hours.log");
  const hours = canLog ? await listHours(supabase, project.id, days[0], days[6]) : [];
  const activity = canLog && sp.draft ? await listWeekActivity(supabase, project.id, days[0], days[6]) : [];
  const config = inboundConfig();
  const draft = await draftTimesheet(project.id, activity, config ? supabaseTriageIo(config.supabaseUrl, config.serviceRoleKey).takeCall : async () => false, aiAsk());
  const tasks = canLog ? await listMyTasks(supabase, project.id, user.id, [...hours.map((h) => h.task_id), ...draft.map((d) => d.taskId)]) : [];
  // The draft only fills empty cells; saved hours stay as they are.
  const cell = (task: string, date: string) => hours.find((h) => h.task_id === task && h.work_date === date)?.hours ?? draft.find((d) => d.taskId === task && d.date === date)?.hours;
  const link = (w: string) => `/app/timesheet?project=${project.id}&week=${w}`;
  const error = sp.error && sp.error in messages.en ? t(sp.error as MessageKey) : null;
  return (
    <main id="main" className="page">
      <p className="eyebrow">{project.name}</p>
      <h1>{t("hours.title")}</h1>
      <p className="intro">{t("hours.intro")}</p>
      {error && <p role="alert" className="badge badge-danger">{error}</p>}
      {sp.saved && <p role="status" className="badge badge-success">{t("hours.saved")}</p>}
      <p><a href={link(shiftWeek(start, -1))}>{t("hours.prev")}</a> · {days[0]} – {days[6]} · <a href={link(shiftWeek(start, 1))}>{t("hours.next")}</a></p>
      {canLog && <p><a href={`${link(start)}&draft=1`}>{t("hours.draft")}</a></p>}
      {sp.draft && canLog && <p role="status" className="badge">{activity.length ? t("hours.draftNote") : t("hours.draftNone")}</p>}
      {!canLog ? <p>{t("hours.noAccess")}</p> : tasks.length === 0 ? <p>{t("hours.empty")}</p> : (
        <form action={submitHours} className="surface form-card">
          <input type="hidden" name="projectId" value={project.id} />
          <input type="hidden" name="week" value={start} />
          <table>
            <thead>
              <tr><th scope="col">{t("hours.task")}</th>{days.map((d) => <th key={d} scope="col">{d.slice(5)}</th>)}<th scope="col">{t("hours.total")}</th></tr>
            </thead>
            <tbody>
              {tasks.map((task) => (
                <tr key={task.id}>
                  <th scope="row">{task.title}</th>
                  {days.map((d) => (
                    <td key={d}><input className="field" type="number" name={`h:${task.id}:${d}`} aria-label={`${task.title} ${d}`} min={0} max={24} step={0.25} defaultValue={cell(task.id, d)} /></td>
                  ))}
                  <td>{hours.filter((h) => h.task_id === task.id).reduce((s, h) => s + h.hours, 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="hint">{t("hours.hint")}</p>
          {activity.some((a) => a.source_message_id) && (
            <ul className="hint">
              {activity.filter((a) => a.source_message_id).map((a) => (
                <li key={`${a.task_id}:${a.active_on}`}>{a.title}: <a href={`/app/timeline?project=${project.id}#message-${a.source_message_id}`}>{t("hours.draftSource")}</a></li>
              ))}
            </ul>
          )}
          <button type="submit" className="btn btn-primary">{t("hours.save")}</button>
        </form>
      )}
    </main>
  );
}
