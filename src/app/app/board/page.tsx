import { supabaseServer } from "@/auth/supabase";
import { listBoardTasks } from "@/data/live";
import { currentProject, listProjects } from "@/data/projects";
import { getLocale, getT } from "@/lib/locale";
import { Board } from "@/app/demo/board/Board";
import { WorkSwitch } from "@/app/WorkSwitch";
import { createBoardTask, saveTaskStatus } from "./actions";

export default async function BoardPage({ searchParams }: { searchParams: Promise<{ project?: string }> }) {
  const t = await getT();
  const locale = await getLocale();
  const supabase = await supabaseServer();
  const project = currentProject(await listProjects(supabase), (await searchParams).project);
  if (!project) return <main id="main" className="page"><p>{t("projects.empty")}</p></main>;
  const tasks = await listBoardTasks(supabase, project.id);
  return (
    <main id="main" className="page">
      <div className="board-head">
        <h1>{t("board.title")}</h1>
        <WorkSwitch current="board" projectId={project.id} t={t} />
      </div>
      <Board key={project.id} initialTasks={tasks} onMove={saveTaskStatus} onAdd={createBoardTask.bind(null, project.id)} locale={locale} />
    </main>
  );
}
