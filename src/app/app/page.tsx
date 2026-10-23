import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/auth/supabase";
import { getBaselineDates, latestHealthUpdate, listBaselines, listBoardTasks, listGanttPlan, listMilestones, listPendingSuggestions, listStreakTasks, suggestionAccuracy } from "@/data/live";
import { currentProject, listProjects } from "@/data/projects";
import { needsInviteStep, ONBOARDED_COOKIE } from "@/domain/onboarding";
import { slipDays } from "@/domain/gantt";
import { byPhase, dueThisWeek, summarize } from "@/domain/overview";
import { celebratedMilestones, challengeMet, goalPercent, knowledgeCount, projectRewardsOn, streakWeeks } from "@/domain/rewards";
import { getLocale, getT } from "@/lib/locale";
import { intlLocale } from "@/lib/messages";
import { postHealthUpdate, setTeamGoal } from "./actions";

const HEALTH = ["on_track", "at_risk", "off_track"] as const;
const HEALTH_CLASS = { on_track: "st-ok", at_risk: "st-warn", off_track: "st-bad" } as const;

// Project overview: one card per project, what needs attention, and the way into AI review. Aggregate only.
export default async function AppHome({ searchParams }: { searchParams: Promise<{ project?: string }> }) {
  const t = await getT();
  const supabase = await supabaseServer();
  const projects = await listProjects(supabase);
  // Invited people already have projects; everyone else starts with the wizard.
  if (projects.length === 0) redirect("/app/welcome");
  if (projects.length === 1) {
    const [{ count: members }, { count: invitations }] = await Promise.all([
      supabase.from("project_members").select("*", { count: "exact", head: true }).eq("project_id", projects[0].id),
      supabase.from("invitations").select("*", { count: "exact", head: true }).eq("project_id", projects[0].id),
    ]);
    const finished = (await cookies()).has(ONBOARDED_COOKIE);
    if (needsInviteStep({ projects: 1, members: members ?? 0, invitations: invitations ?? 0, finished })) redirect("/app/welcome");
  }
  const current = currentProject(projects, (await searchParams).project)!;
  const today = new Date().toISOString().slice(0, 10);
  const locale = intlLocale[await getLocale()];
  const day = new Intl.DateTimeFormat(locale, { day: "numeric", month: "short" });
  const fmt = (iso: string) => day.format(new Date(iso));
  const tasks = await listBoardTasks(supabase, current.id);
  const pulse = summarize(tasks, today);
  const attention = pulse.attention;
  const week = dueThisWeek(tasks, today);
  const [update, plan, baselines, { data: role }] = await Promise.all([
    latestHealthUpdate(supabase, current.id),
    listGanttPlan(supabase, current.id),
    listBaselines(supabase, current.id),
    supabase.rpc("can_manage_project", { p: current.id }),
  ]);
  const baseline = baselines[0] ? await getBaselineDates(supabase, baselines[0].id) : null;
  const slip = baseline ? Math.max(0, ...slipDays(plan.tasks, baseline).values()) : null;
  const blocked = pulse.counts.blocked;
  const milestones = (await listMilestones(supabase, current.id)).sort((a, b) => (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999"));
  const suggestions = (await listPendingSuggestions(supabase, current.id)).length;
  const accuracy = await suggestionAccuracy(supabase, current.id);
  const [{ tasks: streakTasks, sites }, { data: switches }] = await Promise.all([
    listStreakTasks(supabase, current.id),
    supabase.from("reward_switches").select("site"),
  ]);
  const off = (switches ?? []).map((r) => r.site as string);
  const cheers = celebratedMilestones(await listMilestones(supabase, current.id), off, today);
  const rewardsShown = projectRewardsOn((switches ?? []).map((r) => r.site), sites);
  const { data: decisions } = rewardsShown
    ? await supabase.from("decisions").select("details, source_message_id").eq("project_id", current.id)
    : { data: null };
  const knowledge = decisions ? knowledgeCount(decisions.map((d) => ({ details: d.details, sourceMessageId: d.source_message_id }))) : 0;
  const [{ data: goalRows }, { data: canManage }] = rewardsShown
    ? await Promise.all([
        supabase.rpc("team_goal_progress", { p: current.id, p_day: today }),
        supabase.rpc("can_manage_project", { p: current.id }),
      ])
    : [{ data: null }, { data: false }];
  const { data: history } = rewardsShown ? await supabase.rpc("team_goal_history", { p: current.id }) : { data: null };
  const goal = (goalRows as { weeks_done: number; weeks_total: number }[] | null)?.[0];
  const streak = projectRewardsOn((switches ?? []).map((r) => r.site), sites) ? (streakTasks.length ? streakWeeks(streakTasks, today) : 0) : null;
  return (
    <main id="main" className="page overview">
      <header className="ov-head">
        <div>
          <h1>{current.name}</h1>
          <p className="sub">{t("overview.title")} · {t("overview.intro")}</p>
        </div>
        <span className={`st ${update ? HEALTH_CLASS[update.health] : "st-todo"}`}>{update ? t(`overview.health.${update.health}`) : t("overview.health.none")}</span>
        {suggestions > 0 && <a className="btn btn-primary" href={`/app/timeline?project=${current.id}`}>{t("overview.review").replace("{n}", String(suggestions))}</a>}
      </header>
      {update && (
        <p className="ov-update">
          <strong>{t("overview.update.by").replace("{name}", update.author).replace("{date}", fmt(update.createdAt))}</strong> · {update.note}
        </p>
      )}
      {role && (
        <details className="ov-write">
          <summary className="btn">{t("overview.update.write")}</summary>
          <form action={postHealthUpdate}>
            <input type="hidden" name="projectId" value={current.id} />
            <label><span className="field-label">{t("overview.update.health")}</span>
              <select className="field" name="health" defaultValue={update?.health ?? "on_track"}>
                {HEALTH.map((h) => <option key={h} value={h}>{t(`overview.health.${h}`)}</option>)}
              </select>
            </label>
            <label><span className="field-label">{t("overview.update.note")}</span>
              <textarea className="field" name="note" required maxLength={1000} rows={3} />
            </label>
            <button className="btn btn-primary" type="submit">{t("overview.update.post")}</button>
          </form>
        </details>
      )}
      <div className="ov-figs">
        <div>
          <span className="sub">{t("overview.progress")}</span>
          <span className="v">{pulse.percentDone}%</span>
          <progress value={pulse.percentDone} max={100} aria-label={t("overview.progress")} />
          <span className="sub">{t("overview.progressOf").replace("{done}", String(pulse.counts.done)).replace("{total}", String(pulse.total))}</span>
        </div>
        <div>
          <span className="sub">{t("overview.dueWeek")}</span>
          <span className="v">{week.due}</span>
          {week.atRisk > 0 && <span className="st st-warn">{t("overview.atRisk").replace("{n}", String(week.atRisk))}</span>}
        </div>
        <div>
          <span className="sub">{t("overview.blockedFig")}</span>
          <span className="v">{blocked}</span>
        </div>
        <div>
          <span className="sub">{t("overview.scheduleFig")}</span>
          <span className="v">{slip ? `+${slip} d` : slip === 0 ? t("overview.onPlan") : "–"}</span>
          <span className="sub">{baselines[0] ? t("overview.vsBaseline").replace("{date}", fmt(baselines[0].savedAt)) : t("overview.noBaseline")}</span>
        </div>
      </div>
      <div className="ov-two">
        <section aria-labelledby="phases">
          <h2 id="phases" className="k">{t("overview.phases")}</h2>
          <ul className="ov-list">
            {byPhase(tasks).map((p) => (
              <li key={p.phase ?? ""}>
                <span>{p.phase ?? t("overview.noPhase")}</span>
                <span className="sub">{t("overview.phaseOf").replace("{done}", String(p.done)).replace("{total}", String(p.total))}</span>
                <div className="stack" role="img" aria-label={t("overview.phaseOf").replace("{done}", String(p.done)).replace("{total}", String(p.total))}>
                  <i style={{ width: `${(p.done / p.total) * 100}%`, background: "var(--primary)" }} />
                  <i style={{ width: `${(p.blocked / p.total) * 100}%`, background: "var(--warning)" }} />
                  <i style={{ width: `${(p.active / p.total) * 100}%`, background: "var(--text-muted)" }} />
                </div>
              </li>
            ))}
          </ul>
        </section>
        <section aria-labelledby="miles">
          <h2 id="miles" className="k">{t("overview.milestones")}</h2>
          {milestones.length === 0 ? <p className="meta">{t("overview.milestonesNone")}</p> : (
            <ul className="ov-list">
              {milestones.map((m, i) => (
                <li key={i}>
                  <span>{m.title}</span>
                  <span className={`st ${m.status === "done" ? "st-ok" : "st-todo"}`}>
                    {m.status === "done" ? t("overview.doneOn").replace("{date}", fmt(m.updatedAt)) : m.dueDate ? fmt(m.dueDate) : "–"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
      {cheers.length > 0 && (
        <section className="surface overview-panel" aria-labelledby="cheer">
          <h2 id="cheer"><span aria-hidden="true">🎉</span> {t("cheer.title")}</h2>
          <p>{cheers.join(", ")}</p>
          <p className="meta">{t("cheer.note")}</p>
        </section>
      )}
      {streak !== null && (
        <section className="surface overview-panel" aria-labelledby="streak">
          <h2 id="streak"><span aria-hidden="true">🔥</span> {t("streak.title")}</h2>
          <p><strong>{streak}</strong> {t("streak.weeks")}</p>
          <p className="meta">{t("streak.note")}</p>
        </section>
      )}
      {rewardsShown && knowledge > 0 && (
        <section className="surface overview-panel" aria-labelledby="knowledge">
          <h2 id="knowledge"><span aria-hidden="true">📚</span> {t("knowledge.title")}</h2>
          <p><strong>{knowledge}</strong> {t("knowledge.count")}</p>
          <p className="meta">{t("knowledge.note")}</p>
        </section>
      )}
      {rewardsShown && (goal || canManage) && (
        <section className="surface overview-panel" aria-labelledby="goal">
          <h2 id="goal"><span aria-hidden="true">🎯</span> {t("goal.title")}</h2>
          {goal ? (
            <>
              <p>{t("goal.text")}</p>
              <progress value={goalPercent(goal.weeks_done, goal.weeks_total)} max={100} aria-label={t("goal.title")} />
              <p className="meta">{t("goal.progress").replace("{done}", String(goal.weeks_done)).replace("{total}", String(goal.weeks_total))}</p>
            </>
          ) : (
            <p className="meta">{t("goal.none")}</p>
          )}
          <p className="meta">{t("goal.note")}</p>
          {canManage && (
            <form action={setTeamGoal}>
              <input type="hidden" name="projectId" value={current.id} />
              <input type="hidden" name="on" value={goal ? "0" : "1"} />
              <button className="btn btn-secondary" type="submit">{goal ? t("goal.clear") : t("goal.set")}</button>
            </form>
          )}
        </section>
      )}
      {rewardsShown && history && history.length > 0 && (
        <section className="surface overview-panel" aria-labelledby="history">
          <h2 id="history">{t("history.title")}</h2>
          <ul>
            {(history as { month: string; weeks_done: number; weeks_total: number }[]).map((h) => (
              <li key={h.month}>
                {h.month.slice(0, 7)}: {t("goal.progress").replace("{done}", String(h.weeks_done)).replace("{total}", String(h.weeks_total))}
                {challengeMet(h.weeks_done, h.weeks_total) && <span className="badge badge-success"> {t("history.met")}</span>}
              </li>
            ))}
          </ul>
          <p className="meta">{t("goal.note")}</p>
        </section>
      )}
      <section className="surface overview-panel" aria-labelledby="attention">
        <h2 id="attention">{t("overview.attention")}</h2>
        {attention.length === 0 ? (
          <p className="meta">{t("overview.attentionNone")}</p>
        ) : (
          <ul>
            {attention.map((task) => (
              <li key={task.id}>
                <a href={`/app/board?project=${current.id}`}>{task.title}</a>
                <span className={`badge ${task.status === "blocked" ? "badge-danger" : "badge-warning"}`}>
                  {task.status === "blocked" ? t("overview.blocked") : t("overview.overdue")}
                </span>
                {task.dueDate && <time className="meta" dateTime={task.dueDate}>{task.dueDate}</time>}
              </li>
            ))}
          </ul>
        )}
      </section>
      {suggestions > 0 && (
        <section className="surface overview-panel" aria-labelledby="ai">
          <h2 id="ai">{t("overview.ai")} ({suggestions})</h2>
          <p className="meta">{t("overview.aiBody")}</p>
          <p className="meta">{t("overview.aiCounts").replace("{accepted}", String(accuracy.accepted)).replace("{dismissed}", String(accuracy.dismissed))}</p>
        </section>
      )}
    </main>
  );
}
