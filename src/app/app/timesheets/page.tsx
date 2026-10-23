import { supabaseServer } from "@/auth/supabase";
import { getWeekCounts, getWeekDetail, listTimesheetWeeks, listWeekHours } from "@/data/live";
import { currentProject, listProjects } from "@/data/projects";
import { getT } from "@/lib/locale";
import { messages, type MessageKey } from "@/lib/messages";
import { WEEK_TARGET, isoWeek, targetState, weekStart } from "@/domain/timesheet";
import { approveWeeks, decideWeek, submitWeek } from "./actions";

type Search = { project?: string; review?: string; done?: string; error?: string };

const STATUS_CLASS = { submitted: "st-go", approved: "st-ok", sent_back: "st-warn" } as const;

export default async function TimesheetsPage({ searchParams }: { searchParams: Promise<Search> }) {
  const t = await getT();
  const sp = await searchParams;
  const supabase = await supabaseServer();
  const project = currentProject(await listProjects(supabase), sp.project);
  if (!project) return <main id="main" className="page"><p>{t("projects.empty")}</p></main>;
  const [weeks, { data: role }] = await Promise.all([listTimesheetWeeks(supabase, project.id), supabase.rpc("project_role_of", { p: project.id })]);
  const manager = role === "project_manager";
  const [reviewUser, reviewWeek] = (sp.review ?? "").split("|");
  const review = manager ? weeks.find((w) => w.user_id === reviewUser && w.week_start === reviewWeek) : undefined;
  const [hours, detail, counts] = await Promise.all([
    manager && weeks.length ? listWeekHours(supabase, project.id, weeks[weeks.length - 1].week_start) : [],
    review ? getWeekDetail(supabase, project.id, review.user_id, review.week_start) : [],
    role ? getWeekCounts(supabase, project.id, weekStart(new Date().toISOString().slice(0, 10))) : null,
  ]);
  const hoursOf = (w: { user_id: string; week_start: string }) => hours.find((h) => h.user_id === w.user_id && h.week_start === w.week_start)?.hours ?? 0;
  const over = (w: { user_id: string; week_start: string; status: string }) => w.status === "submitted" && targetState(hoursOf(w), WEEK_TARGET, true) === "over";
  const base = `/app/timesheets?project=${project.id}`;
  const pending = weeks.filter((w) => w.status === "submitted").length;
  const error = sp.error && sp.error in messages.en ? t(sp.error as MessageKey) : null;
  return (
    <main id="main" className="page">
      <p className="eyebrow">{project.name}</p>
      <h1>{t("timesheets.title")}</h1>
      <nav className="tabs ts-tabs" aria-label={t("timesheets.tabs")}>
        <a href={`/app/timesheet?project=${project.id}`}>{t("timesheets.tab.week")}</a>
        <a href={base} aria-current="page">{t("timesheets.tab.approvals")}{manager && ` · ${pending}`}</a>
      </nav>
      <p className="intro">{t("timesheets.intro")}</p>
      {error && <p role="alert" className="badge badge-danger">{error}</p>}
      {sp.done && <p role="status" className="badge badge-success">{t("timesheets.done")}</p>}
      {counts && counts.members > 0 && <p className="ts-count">{t("timesheets.counts").replace("{done}", String(counts.submitted)).replace("{total}", String(counts.members))}</p>}
      {role && (
        <form action={submitWeek} className="ts-bar">
          <input type="hidden" name="projectId" value={project.id} />
          <button type="submit" className="btn btn-primary">{t("timesheets.submit")}</button>
        </form>
      )}
      {weeks.length === 0 ? <p>{t("timesheets.empty")}</p> : (
        <>
          {manager && (
            <form id="bulk" action={approveWeeks} className="ts-bar">
              <input type="hidden" name="projectId" value={project.id} />
              <button type="submit" className="btn btn-primary" disabled={pending === 0}>{t("timesheets.approveSelected")}</button>
            </form>
          )}
          <div className="data-table">
            <table>
              <thead>
                <tr>
                  {manager && <th scope="col"><span className="sr-only">{t("timesheets.col.pick")}</span></th>}
                  <th scope="col">{t("timesheets.col.person")}</th>
                  <th scope="col">{t("timesheets.col.week")}</th>
                  {manager && <th scope="col" className="ts-num">{t("timesheets.col.hours")}</th>}
                  <th scope="col">{t("timesheets.col.status")}</th>
                  {manager && <th scope="col"><span className="sr-only">{t("timesheets.review")}</span></th>}
                </tr>
              </thead>
              <tbody>
                {weeks.map((w) => {
                  const name = w.profiles?.display_name ?? "-";
                  const key = `${w.user_id}|${w.week_start}`;
                  return (
                    <tr key={key} aria-current={review === w ? "true" : undefined}>
                      {manager && <td>{w.status === "submitted" && <input type="checkbox" name="pick" value={key} form="bulk" aria-label={`${t("timesheets.col.pick")}: ${name}, ${w.week_start}`} />}</td>}
                      <td><b>{name}</b></td>
                      <td className="ts-num">{isoWeek(w.week_start)} · {w.week_start}</td>
                      {manager && <td className="ts-num">{hoursOf(w).toFixed(1)}</td>}
                      <td><span className={`st ${over(w) ? "st-warn" : STATUS_CLASS[w.status]}`}>{t(over(w) ? "timesheets.status.over" : (`timesheets.status.${w.status}` as MessageKey))}</span>{w.note && <span className="ts-sub"> {w.note}</span>}</td>
                      {manager && <td className="ts-num"><a href={`${base}&review=${encodeURIComponent(key)}`}>{t("timesheets.review")}<span className="sr-only">: {name}, {w.week_start}</span></a></td>}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
      {review && (
        <section className="ts-review" aria-labelledby="ts-review-h">
          <h2 id="ts-review-h">{t("timesheets.reviewTitle").replace("{person}", review.profiles?.display_name ?? "-").replace("{week}", String(isoWeek(review.week_start)))}</h2>
          {detail.length === 0 ? <p>{t("timesheets.reviewEmpty")}</p> : (
            <ul className="ts-detail">
              {detail.map((d) => <li key={`${d.task}${d.work_date}`}><span>{d.task} · {d.work_date}</span><span>{d.hours.toFixed(1)}</span></li>)}
              <li><b>{t("timesheets.col.hours")}</b><b>{detail.reduce((a, d) => a + d.hours, 0).toFixed(1)}</b></li>
            </ul>
          )}
          {review.status === "submitted" && (
            <form action={decideWeek}>
              <input type="hidden" name="projectId" value={project.id} />
              <input type="hidden" name="user" value={review.user_id} />
              <input type="hidden" name="week" value={review.week_start} />
              <label><span className="field-label">{t("timesheets.note")}</span><input className="field" name="note" maxLength={500} /></label>
              <p className="hint">{t("timesheets.noteHint")}</p>
              <p className="ts-bar">
                <button type="submit" name="decision" value="approved" className="btn btn-primary">{t("timesheets.approve")}</button>
                <button type="submit" name="decision" value="sent_back" className="btn">{t("timesheets.sendBack")}</button>
                <a href={base}>{t("timesheets.close")}</a>
              </p>
            </form>
          )}
        </section>
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
    </main>
  );
}
