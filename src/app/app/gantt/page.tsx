import { supabaseServer } from "@/auth/supabase";
import { getBaselineDates, listBaselines, listGanttPlan, listManualItems, listPendingSuggestions, listPlanChoices, listSourceMessages } from "@/data/live";
import { currentProject, listMembers, listProjects } from "@/data/projects";
import { getLocale, getT } from "@/lib/locale";
import { projectPrefix } from "@/domain/board";
import { intlLocale } from "@/lib/messages";
import { InspectorHost } from "@/app/app/items/InspectorHost";
import { Gantt } from "./Gantt";
import { GanttHead } from "./GanttHead";
import { ganttLabels } from "./labels";
import { saveTaskDates } from "./actions";

export default async function GanttPage({ searchParams }: { searchParams: Promise<{ project?: string; baseline?: string; detail?: string }> }) {
  const t = await getT();
  const locale = await getLocale();
  const supabase = await supabaseServer();
  const params = await searchParams;
  const project = currentProject(await listProjects(supabase), params.project);
  if (!project) return <main id="main" className="page"><p>{t("projects.empty")}</p></main>;
  const [plan, baselines, suggestions] = await Promise.all([listGanttPlan(supabase, project.id), listBaselines(supabase, project.id), listPendingSuggestions(supabase, project.id)]);
  const [{ rows: items }, choices, members, { data: { user } }] = await Promise.all([listManualItems(supabase, project.id), listPlanChoices(supabase, project.id), listMembers(supabase, project.id), supabase.auth.getUser()]);
  const sources = await listSourceMessages(supabase, [...new Set(items.flatMap((i) => (i.sourceMessageId ? [i.sourceMessageId] : [])))]);
  const canManage = (await supabase.rpc("can_manage_project", { p: project.id })).data === true;
  const pending = suggestions.find((s) => s.kind === "risk");
  const picked = baselines.find((b) => b.id === params.baseline) ?? baselines[0]; // default: the latest
  const baseline = picked ? await getBaselineDates(supabase, picked.id) : null;
  const labels = ganttLabels(t);
  const today = new Intl.DateTimeFormat(intlLocale[locale], { day: "numeric", month: "long" }).format(new Date());
  return (
    <main id="main" className="page gantt-page">
      <GanttHead t={t} projectId={project.id} projectName={project.name} today={today} groups={plan.groups} canManage={canManage} />
      <InspectorHost kinds={["task", "decision"]} locale={locale} items={items} plan={{ members, ...choices }} projectId={project.id} projectName={project.name} canManage={canManage} userId={user?.id ?? null} sources={sources} suggestions={suggestions} today={new Date().toISOString().slice(0, 10)} hoursHref={`/app/timesheet?project=${project.id}`} reviewHref={`/app/notifications?project=${project.id}`} streamHref="/app/stream" />
      <Gantt projectId={project.id} key={`${project.id}-${picked?.id}`} tasks={plan.tasks} groups={plan.groups} dependencies={plan.dependencies} onSave={saveTaskDates} baseline={baseline} baselineName={picked?.name} labels={labels} locale={locale} prefix={projectPrefix(project.name)}
        risk={pending && { title: pending.title, quote: pending.details, source: t("gantt.risk.sourceMessage"), sourceHref: `/app/stream?project=${project.id}#msg-${pending.messageId}`, reviewHref: `/app/notifications?project=${project.id}` }} />
    </main>
  );
}
