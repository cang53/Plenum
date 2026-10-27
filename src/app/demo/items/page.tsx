import type { ManualItem } from "@/data/live";
import { demoProject, demoSuggestions, demoTasks } from "@/data/demo";
import { MANUAL_KINDS } from "@/domain/items";
import { CreateOption, GroupHead, ItemsHead, matchesItem } from "@/app/app/items/ItemsHead";
import { Fields } from "@/app/app/items/ItemFields";
import { ItemDetail } from "@/app/app/items/ItemDetail";
import { ItemsTable } from "@/app/app/items/ItemsTable";
import { getLocale, getT } from "@/lib/locale";
import { intlLocale, type MessageKey } from "@/lib/messages";

// Sample Items page: the demo tasks plus a risk and a decision, filtered like the real page. Nothing is stored.
export const dynamic = "force-dynamic";

const base: ManualItem = { id: "", kind: "task", title: "", details: "", status: "", riskKind: "", priority: "", startDate: null, dueDate: null, costCode: "", site: "", isMilestone: false, ownerId: null, phaseId: null, parentId: null, predecessorIds: [], number: null, createdAt: "2026-10-01T00:00:00Z", sourceMessageId: null };
const items: ManualItem[] = [
  ...demoTasks.map((x) => ({ ...base, id: x.id, title: x.title, status: x.status, priority: x.priority ?? "", dueDate: x.dueDate, site: x.site ?? "", ownerId: x.ownerName ?? null, phaseId: x.phase ?? null, number: x.number ?? null })),
  { ...base, id: "r1", kind: "risk", riskKind: "risk", title: "Load chart may not match the final gearbox weight", status: "open", ownerId: "Jonas Peeters", dueDate: "2026-12-01" },
  { ...base, id: "r2", kind: "risk", riskKind: "issue", title: "Gearbox ships two weeks late", status: "open", ownerId: "Marta Silva" },
  { ...base, id: "d1", kind: "decision", title: "Install moves to 7 Dec; handover stays 18 Dec" },
];

const plan = { members: [{ userId: "Jonas Peeters", name: "Jonas Peeters", email: "", role: "member" }, { userId: "Marta Silva", name: "Marta Silva", email: "", role: "member" }], phases: [{ id: "Install", name: "Install" }], tasks: demoTasks.map((x) => ({ id: x.id, title: x.title })) };

export default async function DemoItemsPage({ searchParams }: { searchParams: Promise<{ q?: string; kind?: string; status?: string; owner?: string; phase?: string; task?: string; create?: string; edit?: string; detail?: string; from?: string }> }) {
  const t = await getT();
  const locale = intlLocale[await getLocale()];
  const { q = "", kind = "", status = "", owner = "", phase = "", task, detail, create, edit, from } = await searchParams;
  const query = { q, kind, status, owner, phase };
  const shown = items.filter((i) => matchesItem(i, query));
  const names = (k: "ownerId" | "phaseId") => Object.fromEntries(items.flatMap((i) => (i[k] ? [[i[k], i[k]]] : [])));
  const tasks = shown.filter((i) => i.kind === "task");
  const selected = detail ?? task;
  const opened = !edit ? items.find((i) => i.id === selected) : undefined;
  const source = { subject: "Re: Gearbox delivery date", from: "Marta Silva", receivedAt: "2026-10-20T08:00:00Z", href: "/demo/messages", review: { title: "Move install to 7 Dec", href: "/demo/messages" } };
  const keep = new URLSearchParams(Object.entries(query).filter(([, v]) => v));
  return (
    <main id="main" className="page items-page">
      <p className="notice">{t("gantt.demoNotice")}</p>
      <ItemsHead t={t} action="/demo/items" keep={[]} query={query} owners={names("ownerId")} phases={names("phaseId")} pending={demoSuggestions.length} reviewHref="/demo/messages"
        create={MANUAL_KINDS.map((k) => <CreateOption key={k} kind={k} t={t} href={`/demo/items?create=${k}`} />)} />
      {opened && <ItemDetail t={t} locale={locale} item={opened} key_={opened.number ? `L4-${opened.number}` : ""} shareHref={`/demo/items?detail=${opened.id}`} owner={opened.ownerId ?? undefined} phase={opened.phaseId ?? undefined} source={source} activity={[{ at: "2026-10-20T09:30:00Z", text: "Marta Silva created this from a message" }, { at: "2026-10-21T14:05:00Z", text: "Jonas Peeters changed the due date" }]} canManage closeHref="/demo/items" editHref={`/demo/items?edit=${opened.id}`} hoursHref="/demo/timesheet" />}
      {items.filter((i) => i.id === edit).map((i) => <Fields key={i.id} item={i} kind={i.kind} projectId="demo" project={demoProject.name} closeHref="/demo/items" plan={plan} source={source} t={t} />)}
      {MANUAL_KINDS.map((k) => k === create && <Fields key={k} kind={k} projectId="demo" project={demoProject.name} closeHref="/demo/items" plan={plan} source={from ? { ...source, id: from } : undefined} t={t} />)}
      {(!kind || kind === "task") && (
        <>
          <GroupHead title={t("items.group.task")} rows={tasks} label={(s) => t(`status.${s}` as MessageKey)} />
          <ItemsTable kind="task" t={t} owners={names("ownerId")} phases={names("phaseId")} project={demoProject.name} locale={locale} selected={selected} sheetHref={(id) => `/demo/items?${keep}${keep.size ? "&" : ""}detail=${id}`} rows={tasks.map((item) => ({ item }))} />
        </>
      )}
      {(["risk", "decision"] as const).filter((k) => !kind || kind === k).map((k) => (
        <section key={k}>
          <GroupHead title={t(`items.group.${k}` as MessageKey)} rows={shown.filter((i) => i.kind === k)} label={(s) => t(`risk.${s}` as MessageKey)} />
          <ItemsTable kind={k} t={t} selected={selected} sheetHref={(id) => `/demo/items?detail=${id}`} owners={names("ownerId")} rows={shown.filter((i) => i.kind === k).map((item) => ({ item }))} />
        </section>
      ))}
    </main>
  );
}
