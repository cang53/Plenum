import { supabaseServer } from "@/auth/supabase";
import { listBoardTasks } from "@/data/live";
import { currentProject, listProjects } from "@/data/projects";
import { t } from "@/lib/messages";
import { Board } from "@/app/demo/board/Board";
import { saveTaskStatus } from "./actions";

export default async function BoardPage({ searchParams }: { searchParams: Promise<{ project?: string }> }) {
  const supabase = await supabaseServer();
  const project = currentProject(await listProjects(supabase), (await searchParams).project);
  if (!project) return <main id="main" className="page"><p>{t("projects.empty")}</p></main>;
  const tasks = await listBoardTasks(supabase, project.id);
  return (
    <main id="main" className="page">
      <p className="eyebrow">{project.name}</p>
      <h1>{t("board.title")}</h1>
      <p className="intro">{t("board.intro")}</p>
      <Board key={project.id} initialTasks={tasks} onMove={saveTaskStatus} />
    </main>
  );
}
