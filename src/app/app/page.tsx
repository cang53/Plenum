import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/auth/supabase";
import { listBoardTasks, listStreakTasks, listMilestones, listPendingSuggestions, suggestionAccuracy } from "@/data/live";
import { currentProject, listProjects } from "@/data/projects";
import { needsInviteStep, ONBOARDED_COOKIE } from "@/domain/onboarding";
import { summarize } from "@/domain/overview";
import { celebratedMilestones, projectRewardsOn, streakWeeks } from "@/domain/rewards";
import { getT } from "@/lib/locale";

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
  const pulses = await Promise.all(projects.map(async (p) => ({ project: p, pulse: summarize(await listBoardTasks(supabase, p.id), today) })));
  const attention = pulses.find((x) => x.project.id === current.id)!.pulse.attention;
  const suggestions = (await listPendingSuggestions(supabase, current.id)).length;
  const accuracy = await suggestionAccuracy(supabase, current.id);
  const [{ tasks: streakTasks, sites }, { data: switches }] = await Promise.all([
    listStreakTasks(supabase, current.id),
    supabase.from("reward_switches").select("site"),
  ]);
  const off = (switches ?? []).map((r) => r.site as string);
  const cheers = celebratedMilestones(await listMilestones(supabase, current.id), off, today);
  const streak = projectRewardsOn((switches ?? []).map((r) => r.site), sites) ? (streakTasks.length ? streakWeeks(streakTasks, today) : 0) : null;
  return (
    <main id="main" className="page overview">
      <h1>{t("overview.title")}</h1>
      <p className="intro">{t("overview.intro")}</p>
      <ul className="overview-cards">
        {pulses.map(({ project, pulse }) => (
          <li key={project.id} className="surface overview-card" aria-current={project.id === current.id ? "true" : undefined}>
            <svg className="pulse-ring" viewBox="0 0 100 100" role="img" aria-label={`${pulse.percentDone}% ${t("overview.done")}`}>
              <circle cx="50" cy="50" r="42" pathLength="100" />
              <circle cx="50" cy="50" r="42" pathLength="100" strokeDasharray={`${pulse.percentDone} 100`} />
            </svg>
            <div>
              <h2>{project.name}</h2>
              <p className="meta">{pulse.percentDone}% {t("overview.done")} · {pulse.total} {t("overview.tasks")}</p>
              <a className="btn btn-secondary" href={`/app/board?project=${project.id}`}>{t("overview.open")}</a>
            </div>
          </li>
        ))}
      </ul>
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
          <a className="btn btn-primary" href={`/app/timeline?project=${current.id}`}>{t("overview.aiLink")}</a>
        </section>
      )}
    </main>
  );
}
