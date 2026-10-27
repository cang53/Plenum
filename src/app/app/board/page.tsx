import { supabaseServer } from "@/auth/supabase";
import { listBoardTasks, listPendingSuggestions } from "@/data/live";
import { currentProject, listProjects } from "@/data/projects";
import { getLocale, getT } from "@/lib/locale";
import { projectPrefix } from "@/domain/board";
import { Board } from "@/app/demo/board/Board";
import { WorkSwitch } from "@/app/WorkSwitch";
import { TaskSheet } from "../tasks/[id]/TaskSheet";
import { createBoardTask, saveTaskStatus } from "./actions";

export default async function BoardPage({ searchParams }: { searchParams: Promise<{ project?: string; task?: string }> }) {
  const t = await getT();
  const locale = await getLocale();
  const supabase = await supabaseServer();
  const { project: chosen, task } = await searchParams;
  const project = currentProject(await listProjects(supabase), chosen);
  if (!project) return <main id="main" className="page"><p>{t("projects.empty")}</p></main>;
  const tasks = await listBoardTasks(supabase, project.id);
  const pending = (await listPendingSuggestions(supabase, project.id)).length;
  return (
    <main id="main" className="page board-page">
      <div className="board-head">
        <div>
          <h1>{t("board.title")}</h1>
          <p className="sub">{t("board.subtitle")}</p>
        </div>
        <a className="act act-primary" href={`/app/items?project=${project.id}`}>{t("shell.newTask")}</a>
      </div>
      <Board key={project.id} scope={<WorkSwitch current="board" projectId={project.id} t={t} />} pending={pending} reviewHref={`/app/notifications?project=${project.id}`} initialTasks={tasks} onMove={saveTaskStatus} onAdd={createBoardTask.bind(null, project.id)} locale={locale} prefix={projectPrefix(project.name)} openBase={`/app/board?project=${project.id}&task=`} />
      {task && <TaskSheet id={task} closeHref={`/app/board?project=${project.id}`} />}
    </main>
  );
}
