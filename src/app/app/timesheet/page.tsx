import { supabaseServer } from "@/auth/supabase";
import { listHours, listMyTasks, listWeekActivity, myWeekStatus } from "@/data/live";
import { currentProject, listProjects } from "@/data/projects";
import { getT } from "@/lib/locale";
import { messages, type MessageKey } from "@/lib/messages";
import { can, type ProjectRole } from "@/domain/permissions";
import { WEEK_TARGET, copyWeek, shiftWeek, weekDays, weekStart } from "@/domain/timesheet";
import { inboundConfig } from "@/server/inbound-config";
import { draftTimesheet } from "@/server/timesheetDraft";
import { aiAsk, supabaseTriageIo } from "@/server/triage-run";
import { submitHours, submitHoursWeek } from "./actions";
import { WeekGrid } from "./WeekGrid";

type Search = { project?: string; week?: string; draft?: string; copy?: string; submitted?: string; saved?: string; error?: string };

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
  const last = canLog && sp.copy ? copyWeek(await listHours(supabase, project.id, shiftWeek(start, -1), days[0])).filter((c) => days.includes(c.date)) : [];
  const status = canLog && user ? await myWeekStatus(supabase, project.id, user.id, start) : null;
  const locked = status === "approved";
  const activity = canLog && sp.draft ? await listWeekActivity(supabase, project.id, days[0], days[6]) : [];
  const config = inboundConfig();
  const draft = await draftTimesheet(project.id, activity, config ? supabaseTriageIo(config.supabaseUrl, config.serviceRoleKey).takeCall : async () => false, aiAsk());
  const tasks = canLog ? await listMyTasks(supabase, project.id, user.id, [...hours.map((h) => h.task_id), ...draft.map((d) => d.taskId), ...last.map((c) => c.taskId)]) : [];
  // The draft and the copied week only fill empty cells; saved hours stay as they are.
  const cell = (task: string, date: string) => hours.find((h) => h.task_id === task && h.work_date === date)?.hours ?? draft.find((d) => d.taskId === task && d.date === date)?.hours ?? last.find((c) => c.taskId === task && c.date === date)?.hours;
  const initial: Record<string, number> = {};
  for (const task of tasks) for (const d of days) { const v = cell(task.id, d); if (v !== undefined) initial[`${task.id}:${d}`] = v; }
  const link = (w: string) => `/app/timesheet?project=${project.id}&week=${w}`;
  const error = sp.error && sp.error in messages.en ? t(sp.error as MessageKey) : null;
  return (
    <main id="main" className="page">
      <p className="eyebrow">{project.name}</p>
      <h1>{t("hours.title")}</h1>
      <p className="intro">{t("hours.intro")}</p>
      {error && <p role="alert" className="badge badge-danger">{error}</p>}
      {sp.saved && <p role="status" className="badge badge-success">{t("hours.saved")}</p>}
      {sp.submitted && <p role="status" className="badge badge-success">{t("hours.submitted")}</p>}
      <p className="sl-bar"><a href={link(shiftWeek(start, -1))}>{t("hours.prev")}</a><strong>{days[0]} – {days[6]}</strong><a href={link(shiftWeek(start, 1))}>{t("hours.next")}</a>{status && <span className="badge">{t(`hours.status.${status}` as MessageKey)}</span>}</p>
      {canLog && !locked && <p className="sl-bar"><a href={`${link(start)}&copy=1`}>{t("hours.copy")}</a><a href={`${link(start)}&draft=1`}>{t("hours.draft")}</a></p>}
      {sp.draft && canLog && <p role="status" className="badge">{activity.length ? t("hours.draftNote") : t("hours.draftNone")}</p>}
      {sp.copy && canLog && <p role="status" className="badge">{last.length ? t("hours.copyNote") : t("hours.copyNone")}</p>}
      {!canLog ? <p>{t("hours.noAccess")}</p> : tasks.length === 0 ? <p>{t("hours.empty")}</p> : (
        <form action={submitHours} className="surface form-card">
          <input type="hidden" name="projectId" value={project.id} />
          <input type="hidden" name="week" value={start} />
          <WeekGrid tasks={tasks} days={days} today={new Date().toISOString().slice(0, 10)} initial={initial} locked={locked} labels={{ task: t("hours.task"), total: t("hours.total"), week: t("hours.weekTotal"), target: t("hours.target").replace("{target}", String(WEEK_TARGET)), over: t("hours.over"), timer: t("hours.timer"), timerTask: t("hours.timerTask"), timerStart: t("hours.timerStart"), timerStop: t("hours.timerStop"), timerOff: t("hours.timerOff") }} />
          <p className="hint">{t("hours.hint")}</p>
          {activity.some((a) => a.source_message_id) && (
            <ul className="hint">
              {activity.filter((a) => a.source_message_id).map((a) => (
                <li key={`${a.task_id}:${a.active_on}`}>{a.title}: <a href={`/app/timeline?project=${project.id}#message-${a.source_message_id}`}>{t("hours.draftSource")}</a></li>
              ))}
            </ul>
          )}
          {!locked && (
            <p className="sl-bar">
              <button type="submit" className="btn">{t("hours.save")}</button>
              <button type="submit" formAction={submitHoursWeek} className="btn btn-primary">{t("hours.submit")}</button>
            </p>
          )}
        </form>
      )}
    </main>
  );
}
