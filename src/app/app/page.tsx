import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/auth/supabase";
import { latestHealthUpdate, listBoardTasks, listMilestones, listPendingSuggestions, listStreakTasks } from "@/data/live";
import { currentProject, listMembers, listProjects } from "@/data/projects";
import { needsInviteStep, ONBOARDED_COOKIE, projectAddress } from "@/domain/onboarding";
import { summarize } from "@/domain/overview";
import { celebratedMilestones, challengeMet, goalPercent, knowledgeCount, projectRewardsOn, streakWeeks } from "@/domain/rewards";
import { getLocale, getT } from "@/lib/locale";
import { intlLocale } from "@/lib/messages";
import { postHealthUpdate, setTeamGoal } from "./actions";
import { OverviewView, type OverviewData } from "./OverviewView";
import { byPhase } from "@/domain/overview";
import { initials } from "@/domain/board";
import { calendarCells, monthOf, shiftMonth } from "@/domain/calendar";
import type { MessageKey } from "@/lib/messages";

const HEALTH = ["on_track", "at_risk", "off_track"] as const;
const HEALTH_TONE = { on_track: "ok", at_risk: "warn", off_track: "bad" } as const;

// Project overview: one card per project, what needs attention, and the way into AI review. Aggregate only.
export default async function AppHome({ searchParams }: { searchParams: Promise<{ project?: string; month?: string }> }) {
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
  const query = await searchParams;
  const current = currentProject(projects, query.project)!;
  const today = new Date().toISOString().slice(0, 10);
  const locale = intlLocale[await getLocale()];
  const day = new Intl.DateTimeFormat(locale, { day: "numeric", month: "short" });
  const fmt = (iso: string) => day.format(new Date(iso));
  const tasks = await listBoardTasks(supabase, current.id);
  const pulse = summarize(tasks, today);
  const attention = pulse.attention;
  const [update, { data: role }] = await Promise.all([
    latestHealthUpdate(supabase, current.id),
    supabase.rpc("can_manage_project", { p: current.id }),
  ]);
  const milestones = (await listMilestones(supabase, current.id)).sort((a, b) => (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999"));
  const long = new Intl.DateTimeFormat(locale, { weekday: "long", day: "numeric", month: "long" });
  const pending = await listPendingSuggestions(supabase, current.id);
  const firstSuggestion = pending[0];
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
  const weekEnd = new Date(Date.parse(today) + 6 * 864e5).toISOString().slice(0, 10);
  const meta = (x: { ownerName: string | null; dueDate: string | null }) => [x.ownerName, x.dueDate && fmt(x.dueDate)].filter(Boolean).join(" · ");
  const href = (path: string) => `${path}?project=${current.id}`;
  const open = tasks.filter((x) => x.status !== "done");
  const nextMs = milestones.find((m) => m.status !== "done" && m.dueDate && m.dueDate >= today);
  const [{ data: riskRows }, members] = await Promise.all([
    supabase.from("risks").select("likelihood, severity").eq("project_id", current.id).eq("status", "open").neq("kind", "issue"),
    listMembers(supabase, current.id),
  ]);
  const scores = (riskRows ?? []).map((r) => r.likelihood * r.severity);
  const phases = byPhase(tasks).filter((x) => x.phase).map((x) => {
    const due = tasks.filter((k) => k.phase === x.phase && k.dueDate).map((k) => k.dueDate!).sort();
    const done = x.done === x.total;
    const idle = x.done === 0 && x.active === 0 && x.blocked === 0;
    return { name: x.phase!, label: t(`status.${done ? "done" : idle ? "todo" : "in_progress"}`), tone: done ? "ok" as const : idle ? "todo" as const : "info" as const, percent: Math.round((x.done / x.total) * 100), finish: due.length ? fmt(due[due.length - 1]) : null };
  });
  const month = monthOf(query.month, today);
  const monthHref = (m: string) => `${href("/app")}&month=${m}`;
  const [my, mm] = month.split("-").map(Number);
  const weekday = new Intl.DateTimeFormat(locale, { weekday: "short", timeZone: "UTC" });
  const calendar = {
    title: new Intl.DateTimeFormat(locale, { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(my, mm - 1, 1))),
    prevHref: monthHref(shiftMonth(month, -1)),
    nextHref: monthHref(shiftMonth(month, 1)),
    days: Array.from({ length: 7 }, (_, i) => weekday.format(new Date(Date.UTC(2026, 0, 5 + i)))),
    cells: calendarCells(month, today, milestones.filter((m) => m.dueDate).map((m) => m.dueDate!), open.filter((x) => x.dueDate).map((x) => x.dueDate!)),
  };
  const stage = (key: "todo" | "in_progress" | "blocked") => {
    const all = open.filter((x) => x.status === key && x.dueDate && x.dueDate <= weekEnd).sort((x, y) => x.dueDate!.localeCompare(y.dueDate!));
    return {
      key,
      label: t(`status.${key}`),
      count: all.length,
      tasks: all.slice(0, 3).map((x) => {
        const late = x.dueDate! < today;
        return { id: x.id, title: x.title, href: href("/app/board"), chip: late ? t("overview.overdue") : t(`priority.${x.priority}`), tone: late || x.priority === "high" ? "bad" as const : "todo" as const, date: fmt(x.dueDate!), initials: x.ownerName ? initials(x.ownerName) : "" };
      }),
    };
  };
  const data: OverviewData = {
    projectName: current.name,
    dateLabel: long.format(new Date()),
    headline: update ? t(`overview.headline.${update.health}`).replace("{project}", current.name) : current.name,
    timelineHref: href("/app/gantt"),
    reviewHref: href("/app/notifications"),
    newTaskHref: `/app/items?project=${current.id}&create=task`,
    membersHref: href("/app/members"),
    health: update ? { label: t(`overview.health.${update.health}`), tone: HEALTH_TONE[update.health], note: update.note, author: update.author, dateLabel: fmt(update.createdAt) } : null,
    attention: attention.map((x) => ({ id: x.id, title: x.title, href: href("/app/board"), chip: x.status === "blocked" ? t("overview.blocked") : t("overview.overdue"), tone: x.status === "blocked" ? "bad" : "warn", meta: meta(x) })),
    suggestion: firstSuggestion ? { title: firstSuggestion.title, details: firstSuggestion.details, reason: firstSuggestion.reason, href: href("/app/notifications") } : null,
    waiting: pending.length,
    percent: pulse.percentDone,
    counts: { done: pulse.counts.done, in_progress: pulse.counts.in_progress, blocked: pulse.counts.blocked, todo: pulse.counts.todo },
    overdue: tasks.filter((x) => x.status !== "done" && x.dueDate && x.dueDate < today).length,
    nextMilestone: nextMs ? { title: nextMs.title, days: Math.round((Date.parse(nextMs.dueDate!) - Date.parse(today)) / 864e5) } : null,
    risks: { open: scores.length, high: scores.filter((x) => x >= 15).length },
    phases,
    week: [stage("todo"), stage("in_progress"), stage("blocked")],
    calendar,
    team: members.slice(0, 5).map((m) => ({ initials: initials(m.name || m.email), name: m.name || m.email, role: t(`role.${m.role}` as MessageKey) })),
    teamTotal: members.length,
    events: milestones.filter((m) => m.status === "done").sort((x, y) => y.updatedAt.localeCompare(x.updatedAt)).slice(0, 3).map((m) => ({ text: m.title, dateLabel: fmt(m.updatedAt) })),
    address: current.email_slug ? projectAddress(current.email_slug, process.env.INBOUND_EMAIL_DOMAIN) : null,
  };
  return (
    <main id="main" className="page overview">
      <div className="ov-extra">
        <OverviewView t={t} data={data} write={role && (
          <details className="ov-write">
            <summary>{t("overview.update.write")}</summary>
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
        )} />
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
      </div>
    </main>
  );
}
