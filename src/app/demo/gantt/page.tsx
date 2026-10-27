import { Gantt } from "@/app/app/gantt/Gantt";
import { GanttHead } from "@/app/app/gantt/GanttHead";
import { ganttLabels } from "@/app/app/gantt/labels";
import { demoGantt, demoProject } from "@/data/demo";
import { getLocale, getT } from "@/lib/locale";
import { intlLocale } from "@/lib/messages";

// Sample plan dated from now, with a forecast, a late task and a pending risk, so every part of the Timeline can be seen. Nothing is stored.
export const dynamic = "force-dynamic";

export default async function DemoGanttPage() {
  const t = await getT();
  const locale = await getLocale();
  const now = new Date();
  const { tasks, dependencies } = demoGantt(now);
  const today = new Intl.DateTimeFormat(intlLocale[locale], { day: "numeric", month: "long" }).format(now);
  return (
    <main id="main" className="page gantt-page">
      <GanttHead t={t} projectId="demo" projectName={demoProject.name} today={today} />
      <p className="notice">{t("gantt.demoNotice")}</p>
      <Gantt tasks={tasks} dependencies={dependencies} labels={ganttLabels(t)} locale={locale} prefix="P"
        risk={{ title: "Load chart may not match the final gearbox weight", quote: "The crane load chart on page 4 has not been checked against the supplier's final weight. A mismatch could stop the lift on the day.", source: "Jonas Peeters, Re: Crane load chart", sourceHref: "/demo/messages", reviewHref: "/demo/messages" }} />
    </main>
  );
}
