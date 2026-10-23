import { supabaseServer } from "@/auth/supabase";
import { listGanttPlan } from "@/data/live";
import { currentProject, listProjects } from "@/data/projects";
import { getT } from "@/lib/locale";
import { WorkSwitch } from "@/app/WorkSwitch";
import { Gantt } from "./Gantt";
import { saveTaskDates } from "./actions";

export default async function GanttPage({ searchParams }: { searchParams: Promise<{ project?: string }> }) {
  const t = await getT();
  const supabase = await supabaseServer();
  const project = currentProject(await listProjects(supabase), (await searchParams).project);
  if (!project) return <main id="main" className="page"><p>{t("projects.empty")}</p></main>;
  const plan = await listGanttPlan(supabase, project.id);
  const labels = { chart: t("gantt.chart"), today: t("gantt.today"), critical: t("gantt.critical"), conflict: t("gantt.conflict"), print: t("gantt.print"), saveError: t("gantt.saveError"), bar: t("gantt.bar"), empty: t("gantt.empty") };
  return (
    <main id="main" className="page">
      <p className="eyebrow">{project.name}</p>
      <h1>{t("gantt.title")}</h1>
      <p className="intro">{t("gantt.intro")}</p>
      <WorkSwitch current="gantt" projectId={project.id} t={t} />
      <Gantt key={project.id} tasks={plan.tasks} dependencies={plan.dependencies} onSave={saveTaskDates} labels={labels} />
    </main>
  );
}
