import { supabaseServer } from "@/auth/supabase";
import { getBaselineDates, listBaselines, listGanttPlan } from "@/data/live";
import { currentProject, listProjects } from "@/data/projects";
import { getLocale, getT } from "@/lib/locale";
import { WorkSwitch } from "@/app/WorkSwitch";
import { Gantt } from "./Gantt";
import { saveProjectBaseline, saveTaskDates } from "./actions";

export default async function GanttPage({ searchParams }: { searchParams: Promise<{ project?: string; baseline?: string }> }) {
  const t = await getT();
  const locale = await getLocale();
  const supabase = await supabaseServer();
  const params = await searchParams;
  const project = currentProject(await listProjects(supabase), params.project);
  if (!project) return <main id="main" className="page"><p>{t("projects.empty")}</p></main>;
  const [plan, baselines, { data: role }] = await Promise.all([listGanttPlan(supabase, project.id), listBaselines(supabase, project.id), supabase.rpc("project_role_of", { p: project.id })]);
  const picked = baselines.find((b) => b.id === params.baseline) ?? baselines[0]; // default: the latest
  const baseline = picked ? await getBaselineDates(supabase, picked.id) : null;
  const labels = { chart: t("gantt.chart"), today: t("gantt.today"), critical: t("gantt.critical"), conflict: t("gantt.conflict"), print: t("gantt.print"), saveError: t("gantt.saveError"), bar: t("gantt.bar"), empty: t("gantt.empty"), saveBaseline: t("gantt.saveBaseline"), baselineName: t("gantt.baselineName"), baselineSaved: t("gantt.baselineSaved"), baselineNone: t("gantt.baselineNone"), baselineLate: t("gantt.baselineLate"), slip: t("gantt.slip"), milestone: t("gantt.milestone"), task: t("gantt.task"), start: t("gantt.start"), end: t("gantt.end"), zoom: t("gantt.zoom"), week: t("gantt.week"), month: t("gantt.month"), quarter: t("gantt.quarter"), collapse: t("gantt.collapse"), expand: t("gantt.expand"), noPhase: t("gantt.noPhase"), slipShort: t("gantt.slipShort"), baselineActive: t("gantt.baselineActive"), baselineLegend: t("gantt.baselineLegend"), criticalToggle: t("gantt.criticalToggle") };
  const picker = baselines.length > 1 && (
    <form method="get">
      <input type="hidden" name="project" value={project.id} />
      <label>{t("gantt.baselinePick")} <select name="baseline" defaultValue={picked?.id}>{baselines.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select></label>
      <button type="submit" className="btn">{t("gantt.baselineShow")}</button>
    </form>
  );
  return (
    <main id="main" className="page">
      <div className="board-head">
        <h1>{t("app.timeline")}</h1>
        <WorkSwitch current="timeline" projectId={project.id} t={t} />
      </div>
      <p className="intro">{t("gantt.intro")}</p>
      <Gantt key={`${project.id}-${picked?.id}`} tasks={plan.tasks} dependencies={plan.dependencies} onSave={saveTaskDates} baseline={baseline} baselineName={picked?.name} picker={picker || undefined} onBaseline={role === "project_manager" ? saveProjectBaseline.bind(null, project.id) : undefined} labels={labels} locale={locale} />
    </main>
  );
}
