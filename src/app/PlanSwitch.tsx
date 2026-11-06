import type { MessageKey } from "@/lib/messages";

// Plan pills: Gantt and Timelines. Links, because each is its own page.
export function PlanSwitch({ current, projectId, t }: { current: "gantt" | "timelines"; projectId: string; t: (key: MessageKey) => string }) {
  const views = [{ id: "gantt", label: "gantt.title" }, { id: "timelines", label: "timelines.title" }] as const;
  return (
    <nav className="fpills" aria-label={t("plan.switchLabel")}>
      {views.map((v) => (
        <a key={v.id} className="fpill" href={`/app/${v.id}?project=${projectId}`} aria-current={v.id === current ? "page" : undefined}>{t(v.label)}</a>
      ))}
    </nav>
  );
}
