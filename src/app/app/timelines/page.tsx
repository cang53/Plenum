import { supabaseServer } from "@/auth/supabase";
import { listTimelines } from "@/data/timelines";
import { currentProject, listProjects } from "@/data/projects";
import { layoutTimeline } from "@/domain/tlLayout";
import { getLocale, getT } from "@/lib/locale";
import { intlLocale } from "@/lib/messages";
import { ConfirmDialog } from "@/app/app/ConfirmDialog";
import { SlideSvg } from "./SlideSvg";
import { deleteTimelineAction, duplicateTimelineAction, newTimelineAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function TimelinesPage({ searchParams }: { searchParams: Promise<{ project?: string }> }) {
  const t = await getT();
  const locale = intlLocale[await getLocale()];
  const supabase = await supabaseServer();
  const project = currentProject(await listProjects(supabase), (await searchParams).project);
  if (!project) return <main id="main" className="page"><p>{t("projects.empty")}</p></main>;
  const [rows, role] = await Promise.all([listTimelines(supabase, project.id), supabase.rpc("project_role_of", { p: project.id })]);
  const canEdit = role.data !== "contributor";
  const today = new Date().toISOString().slice(0, 10);
  const day = new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", year: "numeric" });
  const labels = { today: t("timelines.today"), activity: t("timelines.f.activity"), owner: t("timelines.f.owner"), locale };
  return (
    <main id="main" className="page tl-list-page">
      <div className="board-head">
        <div><h1>{t("timelines.title")}</h1><p className="sub">{t("timelines.subtitle")}</p></div>
        {canEdit && <form action={newTimelineAction}><input type="hidden" name="projectId" value={project.id} /><button type="submit" className="btn btn-primary">＋ {t("timelines.new")}</button></form>}
      </div>
      {rows.length === 0 ? <p className="empty">{t("timelines.empty")}</p> : (
        <ul className="tl-grid">
          {rows.map((r) => (
            <li key={r.id} className="tl-card surface">
              <a className="tl-thumb" href={`/app/timelines/${r.id}?project=${project.id}`} aria-label={`${t("timelines.open")}: ${r.title}`}><SlideSvg layout={layoutTimeline(r.doc, today, labels)} label={r.title} /></a>
              <div className="tl-card-body">
                <h2><a href={`/app/timelines/${r.id}?project=${project.id}`}>{r.title}</a></h2>
                <p className="sub">{t("timelines.meta").replace("{author}", r.author).replace("{created}", day.format(new Date(r.createdAt))).replace("{updated}", day.format(new Date(r.updatedAt)))}</p>
                <div className="tl-actions">
                  <a className="btn" href={`/app/timelines/${r.id}?project=${project.id}`}>{t("timelines.open")}</a>
                  {canEdit && <>
                    <form action={duplicateTimelineAction}><input type="hidden" name="id" value={r.id} /><button type="submit" className="btn">{t("timelines.duplicate")}</button></form>
                    <ConfirmDialog trigger={t("timelines.delete")} title={t("timelines.deleteTitle")} body={t("timelines.deleteBody")} cancel={t("timelines.cancel")}>
                      <form action={deleteTimelineAction}><input type="hidden" name="id" value={r.id} /><input type="hidden" name="projectId" value={project.id} /><button type="submit" className="btn btn-danger">{t("timelines.delete")}</button></form>
                    </ConfirmDialog>
                  </>}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
