import type { ManualItem } from "@/data/live";
import { demoProject, demoSuggestions, demoTasks } from "@/data/demo";
import { MANUAL_KINDS } from "@/domain/items";
import { GroupHead, ItemsHead, matchesItem } from "@/app/app/items/ItemsHead";
import { ItemsTable } from "@/app/app/items/ItemsTable";
import { getLocale, getT } from "@/lib/locale";
import { intlLocale, type MessageKey } from "@/lib/messages";

// Sample Items page: the demo tasks plus a risk and a decision, filtered like the real page. Nothing is stored.
export const dynamic = "force-dynamic";

const base: ManualItem = { id: "", kind: "task", title: "", details: "", status: "", riskKind: "", priority: "", startDate: null, dueDate: null, costCode: "", site: "", isMilestone: false, ownerId: null, phaseId: null, parentId: null, predecessorIds: [], number: null, createdAt: "2026-10-01T00:00:00Z" };
const items: ManualItem[] = [
  ...demoTasks.map((x) => ({ ...base, id: x.id, title: x.title, status: x.status, priority: x.priority ?? "", dueDate: x.dueDate, site: x.site ?? "", ownerId: x.ownerName ?? null, phaseId: x.phase ?? null, number: x.number ?? null })),
  { ...base, id: "r1", kind: "risk", riskKind: "risk", title: "Load chart may not match the final gearbox weight", status: "open", ownerId: "Jonas Peeters", dueDate: "2026-12-01" },
  { ...base, id: "r2", kind: "risk", riskKind: "issue", title: "Gearbox ships two weeks late", status: "open", ownerId: "Marta Silva" },
  { ...base, id: "d1", kind: "decision", title: "Install moves to 7 Dec; handover stays 18 Dec" },
];

export default async function DemoItemsPage({ searchParams }: { searchParams: Promise<{ q?: string; kind?: string; status?: string; owner?: string; phase?: string; task?: string }> }) {
  const t = await getT();
  const locale = intlLocale[await getLocale()];
  const { q = "", kind = "", status = "", owner = "", phase = "", task } = await searchParams;
  const query = { q, kind, status, owner, phase };
  const shown = items.filter((i) => matchesItem(i, query));
  const names = (k: "ownerId" | "phaseId") => Object.fromEntries(items.flatMap((i) => (i[k] ? [[i[k], i[k]]] : [])));
  const tasks = shown.filter((i) => i.kind === "task");
  const selected = task ?? tasks.find((i) => i.status !== "done")?.id;
  const keep = new URLSearchParams(Object.entries(query).filter(([, v]) => v));
  return (
    <main id="main" className="page items-page">
      <p className="notice">{t("gantt.demoNotice")}</p>
      <ItemsHead t={t} action="/demo/items" keep={[]} query={query} owners={names("ownerId")} phases={names("phaseId")} pending={demoSuggestions.length} reviewHref="/demo/messages"
        create={MANUAL_KINDS.map((k) => <details key={k} name="create-item"><summary>{t(`kind.${k}` as MessageKey)}</summary><p className="notice">{t("gantt.demoNotice")}</p></details>)} />
      {(!kind || kind === "task") && (
        <>
          <GroupHead title={t("items.group.task")} rows={tasks} label={(s) => t(`status.${s}` as MessageKey)} />
          <ItemsTable kind="task" t={t} owners={names("ownerId")} phases={names("phaseId")} project={demoProject.name} locale={locale} selected={selected} sheetHref={(id) => `/demo/items?${keep}${keep.size ? "&" : ""}task=${id}`} rows={tasks.map((item) => ({ item, edit: null }))} />
        </>
      )}
      {(["risk", "decision"] as const).filter((k) => !kind || kind === k).map((k) => (
        <section key={k}>
          <GroupHead title={t(`items.group.${k}` as MessageKey)} rows={shown.filter((i) => i.kind === k)} label={(s) => t(`risk.${s}` as MessageKey)} />
          <ItemsTable kind={k} t={t} owners={names("ownerId")} rows={shown.filter((i) => i.kind === k).map((item) => ({ item, edit: null }))} />
        </section>
      ))}
    </main>
  );
}
