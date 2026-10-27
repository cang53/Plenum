import type { MessageKey } from "@/lib/messages";

// The strings the chart needs; a function cannot cross from the server page to the chart, so they are looked up here.
export function ganttLabels(t: (key: MessageKey) => string) {
  return { chart: t("gantt.chart"), today: t("gantt.today"), critical: t("gantt.critical"), conflict: t("gantt.conflict"), print: t("gantt.print"), saveError: t("gantt.saveError"), bar: t("gantt.bar"), empty: t("gantt.empty"), saveBaseline: t("gantt.saveBaseline"), baselineName: t("gantt.baselineName"), baselineSaved: t("gantt.baselineSaved"), baselineNone: t("gantt.baselineNone"), baselineLate: t("gantt.baselineLate"), slip: t("gantt.slip"), milestone: t("gantt.milestone"), task: t("gantt.task"), start: t("gantt.start"), end: t("gantt.end"), zoom: t("gantt.zoom"), week: t("gantt.week"), month: t("gantt.month"), quarter: t("gantt.quarter"), collapse: t("gantt.collapse"), expand: t("gantt.expand"), noPhase: t("gantt.noPhase"), slipShort: t("gantt.slipShort"), baselineActive: t("gantt.baselineActive"), baselineLegend: t("gantt.baselineLegend"), criticalToggle: t("gantt.criticalToggle") };
}
