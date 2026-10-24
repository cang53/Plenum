import type { MessageKey } from "@/lib/messages";

const VIEWS = [
  { id: "board", path: "board", label: "ui.segmented.board" },
  { id: "timeline", path: "gantt", label: "ui.segmented.timeline" },
  { id: "items", path: "items", label: "ui.segmented.items" },
] as const satisfies readonly { id: string; path: string; label: MessageKey }[];

// Board / Timeline / Items switch; links, because each view is its own page.
export function WorkSwitch({ current, projectId, t }: { current: (typeof VIEWS)[number]["id"]; projectId: string; t: (key: MessageKey) => string }) {
  return (
    <nav className="work-switch" aria-label={t("ui.segmented.label")}>
      <div className="segmented">
        {VIEWS.map((v) => (
          <a key={v.id} href={`/app/${v.path}?project=${projectId}`} aria-current={v.id === current ? "page" : undefined}>{t(v.label)}</a>
        ))}
      </div>
    </nav>
  );
}
