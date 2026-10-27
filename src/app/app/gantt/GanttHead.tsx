import type { MessageKey } from "@/lib/messages";

// Heading row from the Figma frame: title with project and date, the Plan / List switch and the primary action.
export function GanttHead({ t, projectId, projectName, today }: { t: (key: MessageKey) => string; projectId: string; projectName: string; today: string }) {
  return (
    <div className="board-head gantt-head">
      <div>
        <h1>{t("app.timeline")}</h1>
        <p className="sub">{t("gantt.subtitle").replace("{project}", projectName).replace("{date}", today)}</p>
      </div>
      <div className="gantt-head-actions">
        <nav className="work-switch" aria-label={t("gantt.viewLabel")}>
          <div className="segmented">
            <a href={`/app/gantt?project=${projectId}`} aria-current="page">{t("gantt.viewPlan")}</a>
            <a href={`/app/items?project=${projectId}`}>{t("gantt.viewList")}</a>
          </div>
        </nav>
        <a className="act act-primary" href={`/app/items?project=${projectId}`}>＋ {t("shell.newTask")}</a>
      </div>
    </div>
  );
}
