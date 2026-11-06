import type { MessageKey } from "@/lib/messages";
import type { GanttGroup } from "@/domain/gantt";
import { AddMenu } from "@/app/AddMenu";
import { PlanSwitch } from "@/app/PlanSwitch";

// Heading row from the Figma frame: title with project and date, the Plan / List / Board switch and the primary action.
export function GanttHead({ t, projectId, projectName, today, groups, canManage }: { t: (key: MessageKey) => string; projectId: string; projectName: string; today: string; groups: GanttGroup[]; canManage: boolean }) {
  return (
    <div className="board-head gantt-head">
      <div>
        <h1 className="h1">{t("app.plan")}</h1>
        <p className="subline">{t("gantt.subtitle").replace("{project}", projectName).replace("{date}", today)}</p>
      </div>
      <div className="head-actions">
        <PlanSwitch current="gantt" projectId={projectId} t={t} />
        <AddMenu taskHref={`/app/gantt?project=${projectId}&create=task`} projectId={projectId} groups={groups} canManage={canManage} text={{ add: t("gantt.add"), task: t("gantt.add.task"), group: t("gantt.add.group"), groupText: { add: t("gantt.group.add"), name: t("gantt.group.name"), parent: t("gantt.group.parent"), top: t("gantt.group.top"), error: t("gantt.group.error") } }} />
      </div>
    </div>
  );
}
