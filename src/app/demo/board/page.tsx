import { demoProject, demoTasks } from "@/data/demo";
import { t } from "@/lib/messages";
import { Board } from "./Board";

export default function DemoBoardPage() {
  return (
    <main id="main" className="page">
      <div className="board-head">
        <h1>{t("board.title")}</h1>
        <span className="sub">{demoProject.name}</span>
      </div>
      <p className="notice">{t("board.demoNotice")}</p>
      <Board initialTasks={demoTasks} />
    </main>
  );
}
