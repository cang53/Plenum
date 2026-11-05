import type { MessageKey } from "@/lib/messages";
import type { GanttGroup } from "@/domain/gantt";
import { AddMenu } from "./AddMenu";

// Heading row from the Figma frame: title with project and date, the Plan / List / Board switch and the primary action.
export function GanttHead({ t, projectId, projectName, today, groups, canManage }: { t: (key: MessageKey) => string; projectId: string; projectName: string; today: string; groups: GanttGroup[]; canManage: boolean }) {
  return (
    <div className="board-head gantt-head">
      <div>
        <h1>{t("gantt.title")}</h1>
        <p className="sub">{t("gantt.subtitle").replace("{project}", projectName).replace("{date}", today)}</p>
      </div>
      <div className="gantt-head-actions">
        <nav className="work-switch" aria-label={t("gantt.viewLabel")}>
          <div className="segmented">
            <a href={`/app/gantt?project=${projectId}`} aria-current="page">{t("gantt.viewPlan")}</a>
            <a href={`/app/items?project=${projectId}`}>{t("gantt.viewList")}</a>
            <a href={`/app/board?project=${projectId}`}>{t("gantt.viewBoard")}</a>
          </div>
        </nav>
        <AddMenu projectId={projectId} groups={groups} canManage={canManage} text={{ add: t("gantt.add"), task: t("gantt.add.task"), group: t("gantt.add.group"), groupText: { add: t("gantt.group.add"), name: t("gantt.group.name"), parent: t("gantt.group.parent"), top: t("gantt.group.top"), error: t("gantt.group.error") } }} />
      </div>
    </div>
  );
}
