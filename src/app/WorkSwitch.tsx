import type { MessageKey } from "@/lib/messages";

const VIEWS = [
  { id: "timeline", path: "gantt", label: "gantt.viewPlan" },
  { id: "items", path: "items", label: "gantt.viewList" },
  { id: "board", path: "board", label: "gantt.viewBoard" },
] as const satisfies readonly { id: string; path: string; label: MessageKey }[];

// Plan / List / Board switch; links, because each view is its own page.
export function WorkSwitch({ current, projectId, t }: { current: (typeof VIEWS)[number]["id"]; projectId: string; t: (key: MessageKey) => string }) {
  return (
    <nav className="work-switch" aria-label={t("gantt.viewLabel")}>
      <div className="segmented">
        {VIEWS.map((v) => (
          <a key={v.id} href={`/app/${v.path}?project=${projectId}`} aria-current={v.id === current ? "page" : undefined}>{t(v.label)}</a>
        ))}
      </div>
    </nav>
  );
}
