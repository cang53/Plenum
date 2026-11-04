import { notFound, redirect } from "next/navigation";
import { supabaseServer } from "@/auth/supabase";
import { listGanttPlan } from "@/data/live";
import { getTimeline } from "@/data/timelines";
import { getLocale, getT } from "@/lib/locale";
import { intlLocale } from "@/lib/messages";
import { timelineLabels } from "../labels";
import { saveTimelineAction } from "../actions";
import { TimelineEditor } from "../TimelineEditor";

export const dynamic = "force-dynamic";

export default async function TimelinePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ project?: string }> }) {
  const { id } = await params;
  const { project } = await searchParams;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const t = await getT();
  const supabase = await supabaseServer();
  const row = await getTimeline(supabase, id);
  // Not visible (wrong project or no access): back to the list.
  if (!row) redirect(`/app/timelines${project ? `?project=${encodeURIComponent(project)}` : ""}`);
  const [plan, role] = await Promise.all([listGanttPlan(supabase, row.projectId), supabase.rpc("project_role_of", { p: row.projectId })]);
  return (
    <main id="main" className="tl-main">
      <TimelineEditor
        id={row.id} listHref={`/app/timelines?project=${row.projectId}`} initial={row.doc} tasks={plan.tasks} canEdit={role.data !== "contributor"} labels={timelineLabels(t)}
        locale={intlLocale[await getLocale()]} today={new Date().toISOString().slice(0, 10)} author={row.author} createdAt={row.createdAt} updatedAt={row.updatedAt} save={saveTimelineAction}
      />
    </main>
  );
}
