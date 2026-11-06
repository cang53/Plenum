import { supabaseServer } from "@/auth/supabase";
import { listBoardTasks, listPendingSuggestions } from "@/data/live";
import { currentProject, listMembers, listProjects } from "@/data/projects";
import { getLocale, getT } from "@/lib/locale";
import { projectPrefix } from "@/domain/board";
import { Board } from "@/app/demo/board/Board";
import { AddMenu } from "@/app/AddMenu";
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
  const [members, { data: { user } }] = await Promise.all([listMembers(supabase, project.id), supabase.auth.getUser()]);
  const me = members.find((m) => m.userId === user?.id)?.name;
  const pending = (await listPendingSuggestions(supabase, project.id)).length;
  return (
    <main id="main" className="page board-page">
      <div className="board-head">
        <div>
          <h1 className="h1">{t("board.title")}</h1>
          <p className="subline">{t("board.subtitle")}</p>
        </div>
        <div className="head-actions">
          <AddMenu projectId={project.id} groups={[]} canManage={false} taskHref={`/app/items?project=${project.id}&create=task`} text={{ add: t("gantt.add"), task: t("gantt.add.task"), group: t("gantt.add.group"), groupText: { add: "", name: "", parent: "", top: "", error: "" } }} />
        </div>
      </div>
      <Board key={project.id} me={me} pending={pending} reviewHref={`/app/notifications?project=${project.id}`} initialTasks={tasks} onMove={saveTaskStatus} onAdd={createBoardTask.bind(null, project.id)} locale={locale} prefix={projectPrefix(project.name)} openBase={`/app/board?project=${project.id}&task=`} />
      {task && <TaskSheet id={task} closeHref={`/app/board?project=${project.id}`} />}
    </main>
  );
}
