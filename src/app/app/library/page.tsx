import { supabaseServer } from "@/auth/supabase";
import { listLessons } from "@/data/library";
import { currentProject, listProjects } from "@/data/projects";
import { getLocale, getT } from "@/lib/locale";
import { intlLocale } from "@/lib/messages";
import { addLessonDoc, removeLessonDoc } from "./actions";
import { LibraryView } from "./LibraryView";

export default async function LibraryPage({ searchParams }: { searchParams: Promise<{ project?: string }> }) {
  const t = await getT();
  const supabase = await supabaseServer();
  const project = currentProject(await listProjects(supabase), (await searchParams).project);
  if (!project) return <main id="main" className="page"><p>{t("projects.empty")}</p></main>;
  const { data: pr } = await supabase.from("projects").select("workspace_id").eq("id", project.id).single();
  const workspaceId = pr?.workspace_id as string;
  const [lessons, staff] = await Promise.all([listLessons(supabase, workspaceId).catch(() => []), supabase.rpc("is_workspace_staff", { ws: workspaceId })]);
  return <LibraryView t={t} locale={intlLocale[await getLocale()]} project={project} workspaceId={workspaceId} lessons={lessons} staff={Boolean(staff.data)} add={addLessonDoc} remove={removeLessonDoc} />;
}
