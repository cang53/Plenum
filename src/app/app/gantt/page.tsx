import { supabaseServer } from "@/auth/supabase";
import { getBaselineDates, listBaselines, listGanttPlan, listPendingSuggestions } from "@/data/live";
import { currentProject, listProjects } from "@/data/projects";
import { getLocale, getT } from "@/lib/locale";
import { projectPrefix } from "@/domain/board";
import { intlLocale } from "@/lib/messages";
import { Gantt } from "./Gantt";
import { GanttHead } from "./GanttHead";
import { ganttLabels } from "./labels";
import { saveProjectBaseline, saveTaskDates } from "./actions";

export default async function GanttPage({ searchParams }: { searchParams: Promise<{ project?: string; baseline?: string }> }) {
  const t = await getT();
  const locale = await getLocale();
  const supabase = await supabaseServer();
  const params = await searchParams;
  const project = currentProject(await listProjects(supabase), params.project);
  if (!project) return <main id="main" className="page"><p>{t("projects.empty")}</p></main>;
  const [plan, baselines, { data: role }, suggestions] = await Promise.all([listGanttPlan(supabase, project.id), listBaselines(supabase, project.id), supabase.rpc("project_role_of", { p: project.id }), listPendingSuggestions(supabase, project.id)]);
  const pending = suggestions.find((s) => s.kind === "risk");
  const picked = baselines.find((b) => b.id === params.baseline) ?? baselines[0]; // default: the latest
  const baseline = picked ? await getBaselineDates(supabase, picked.id) : null;
  const labels = ganttLabels(t);
  const picker = baselines.length > 1 && (
    <form method="get">
      <input type="hidden" name="project" value={project.id} />
      <label>{t("gantt.baselinePick")} <select name="baseline" defaultValue={picked?.id}>{baselines.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select></label>
      <button type="submit" className="btn">{t("gantt.baselineShow")}</button>
    </form>
  );
  const today = new Intl.DateTimeFormat(intlLocale[locale], { day: "numeric", month: "long" }).format(new Date());
  return (
    <main id="main" className="page gantt-page">
      <GanttHead t={t} projectId={project.id} projectName={project.name} today={today} />
      <Gantt key={`${project.id}-${picked?.id}`} tasks={plan.tasks} dependencies={plan.dependencies} onSave={saveTaskDates} baseline={baseline} baselineName={picked?.name} picker={picker || undefined} onBaseline={role === "project_manager" ? saveProjectBaseline.bind(null, project.id) : undefined} labels={labels} locale={locale} prefix={projectPrefix(project.name)}
        risk={pending && { title: pending.title, quote: pending.details, source: t("gantt.risk.sourceMessage"), sourceHref: `/app/stream?project=${project.id}#msg-${pending.messageId}`, reviewHref: `/app/notifications?project=${project.id}` }} />
    </main>
  );
}
