import { demoProject, demoTasks } from "@/data/demo";
import { t } from "@/lib/messages";
import { Board } from "./Board";

export default function DemoBoardPage() {
  return (
    <main className="page">
      <p className="eyebrow">{demoProject.name}</p>
      <h1>{t("board.title")}</h1>
      <p className="intro">{t("board.intro")}</p>
      <p className="notice">{t("board.demoNotice")}</p>
      <Board initialTasks={demoTasks} />
    </main>
  );
}
