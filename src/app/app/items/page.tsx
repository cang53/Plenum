import { supabaseServer } from "@/auth/supabase";
import { listManualItems, listPendingSuggestions, listPlanChoices, type ManualItem } from "@/data/live";
import { currentProject, listMembers, listProjects } from "@/data/projects";
import { MANUAL_KINDS } from "@/domain/items";
import { STATUSES } from "@/domain/board";
import { COLUMNS, matchesQuick, parseColumns, parseQuick, QUICK_FILTERS, quickCounts } from "@/domain/itemsView";
import { isEarlyWarning, rewardsOn } from "@/domain/rewards";
import type { MessageKey } from "@/lib/messages";
import { MoreLink } from "@/app/app/MoreLink";
import { getLocale, getT } from "@/lib/locale";
import { intlLocale } from "@/lib/messages";
import { WorkSwitch } from "@/app/WorkSwitch";
import { TaskDetail } from "../tasks/[id]/TaskDetail";
import { bulkTasks } from "./actions";
import { OfflineTasks } from "./OfflineTasks";
import { ItemsTable } from "./ItemsTable";
import { Fields } from "./ItemFields";
import { CreateOption, GroupHead, ItemsHead, matchesItem } from "./ItemsHead";

export default async function ItemsPage({ searchParams }: { searchParams: Promise<{ project?: string; after?: string; kind?: string; quick?: string; col?: string | string[]; task?: string; create?: string; edit?: string; q?: string; status?: string; owner?: string; phase?: string }> }) {
  const t = await getT();
  const supabase = await supabaseServer();
  const { project: chosen, after, kind: only, quick: quickParam, col, task, create, edit, q = "", status = "", owner = "", phase = "" } = await searchParams;
  const query = { q, kind: only ?? "", status, owner, phase };
  const quick = parseQuick(quickParam);
  const columns = parseColumns(col);
  const today = new Date().toISOString().slice(0, 10);
  const project = currentProject(await listProjects(supabase), chosen);
  if (!project) return <main id="main" className="page"><p>{t("projects.empty")}</p></main>;
  const [{ rows: loaded, next }, choices, members, { data: { user } }, suggestions] = await Promise.all([listManualItems(supabase, project.id, after), listPlanChoices(supabase, project.id), listMembers(supabase, project.id), supabase.auth.getUser(), listPendingSuggestions(supabase, project.id)]);
  const items = loaded.filter((i) => matchesItem(i, query));
  const owners = Object.fromEntries(members.map((m) => [m.userId, m.name || m.email]));
  // Quick filters are about tasks, so the other kinds step aside while one is on.
  const shown = (i: ManualItem) => quick === "all" || (i.kind === "task" && matchesQuick(i, quick, user?.id ?? null, today));
  const cols: [string, string][] = col === undefined ? [] : [col].flat().map((c) => ["col", c]);
  const keep = `${new URLSearchParams([...Object.entries(query).filter(([, v]) => v), ...cols])}`.replace(/^(?=.)/, "&");
  const href = (q: string) => `/app/items?project=${project.id}${q === "all" ? "" : `&quick=${q}`}${keep}`;
  const plan = { members, ...choices };
  // Risks have no site, so only the "off everywhere" switch hides the badge.
  const [{ data: switches }, { data: risks }, { data: taskRows }] = await Promise.all([
    supabase.from("reward_switches").select("site"),
    supabase.from("risks").select("created_at, due_date").neq("kind", "issue").eq("project_id", project.id),
    supabase.from("tasks").select("status, due_date, owner_id").eq("project_id", project.id),
  ]);
  const counts = quickCounts((taskRows ?? []).map((r) => ({ status: r.status as string, dueDate: r.due_date as string | null, ownerId: r.owner_id as string | null })), user?.id ?? null, today);
  const rewards = rewardsOn((switches ?? []).map((r) => r.site as string), "");
  const early = rewards ? (risks ?? []).filter((r) => isEarlyWarning(r.created_at as string, r.due_date as string | null)).length : 0;
  const phaseNames = Object.fromEntries(choices.phases.map((p) => [p.id, p.name]));
  const visibleTasks = items.filter((i) => i.kind === "task" && shown(i));
  const selected = visibleTasks.find((i) => i.id === task) ?? (task ? undefined : visibleTasks.find((i) => i.status !== "done") ?? visibleTasks[0]);
  const selectedId = task ?? selected?.id;
  const showTasks = !only || only === "task";
  return (
    <main id="main" className="page items-page">
      <ItemsHead t={t} action="/app/items" keep={[["project", project.id], ...(quick !== "all" ? [["quick", quick] as [string, string]] : []), ...cols]} query={query} owners={owners} phases={phaseNames} pending={suggestions.length} reviewHref={`/app/notifications?project=${project.id}`}
        create={MANUAL_KINDS.map((k) => (
          <CreateOption key={k} kind={k} t={t} href={`${href(quick)}&create=${k}`} />
        ))} />
      {MANUAL_KINDS.map((k) => k === create && <Fields key={k} kind={k} projectId={project.id} project={project.name} closeHref={href(quick)} plan={plan} t={t} />)}
      {items.filter((i) => i.id === edit).map((i) => <Fields key={i.id} item={i} kind={i.kind} projectId={project.id} project={project.name} closeHref={href(quick)} plan={plan} t={t} />)}
      <div className="items-bar">
        <WorkSwitch current="items" projectId={project.id} t={t} />
        <span className="grow" />
        <details className="items-cols">
          <summary className="chip">{t("items.cols")} ▾</summary>
          <form method="get" action="/app/items">
            <input type="hidden" name="project" value={project.id} />
            {only && <input type="hidden" name="kind" value={only} />}
            {quick !== "all" && <input type="hidden" name="quick" value={quick} />}
            <input type="hidden" name="col" value="-" />
            {COLUMNS.map((c) => <label key={c}><input type="checkbox" name="col" value={c} defaultChecked={columns.includes(c)} /> {t(`items.col.${c}` as MessageKey)}</label>)}
            <button type="submit" className="btn btn-secondary">{t("items.cols.apply")}</button>
          </form>
        </details>
        <a className="btn" href={`/app/import?project=${project.id}`}>{t("import.title")}</a>
      </div>
      <div className="items-tools">
        <nav className="items-quick" aria-label={t("items.quick.label")}>
          {QUICK_FILTERS.map((q) => (
            <a key={q} href={href(q)} aria-current={q === quick ? "page" : undefined}>{t(`items.quick.${q}` as MessageKey)} <span className="items-count">{counts[q]}</span></a>
          ))}
        </nav>
      </div>
      {showTasks && items.some((i) => i.kind === "task") && (
        <form id="bulk" action={bulkTasks} aria-label={t("bulk.title")} className="surface bulk-bar">
          <p className="intro">{t("bulk.hint")}</p>
          <label>{t("board.statusLabel")}{" "}
            <select name="status">{STATUSES.map((s) => <option key={s} value={s}>{t(`status.${s}`)}</option>)}</select>
          </label>
          <button type="submit" name="op" value="status" className="btn btn-secondary">{t("bulk.setStatus")}</button>
          <label>{t("items.owner")}{" "}
            <select name="ownerId">
              <option value="">{t("items.none")}</option>
              {members.map((m) => <option key={m.userId} value={m.userId}>{m.name || m.email}</option>)}
            </select>
          </label>
          <button type="submit" name="op" value="owner" className="btn btn-secondary">{t("bulk.setOwner")}</button>
          <label>{t("board.due")} <input type="date" name="dueDate" className="field" /></label>
          <button type="submit" name="op" value="due" className="btn btn-secondary">{t("bulk.setDue")}</button>
        </form>
      )}
      {showTasks && <GroupHead title={t("items.group.task")} rows={visibleTasks} label={(s) => t(`status.${s}` as MessageKey)} />}
      {showTasks && ((quick !== "all" || q || status || owner || phase) && !visibleTasks.length ? <p className="intro">{t("items.noMatch")}</p> : <ItemsTable kind="task" t={t} sheetHref={(id) => `${href(quick)}&task=${id}`} columns={columns} owners={owners} phases={phaseNames} project={project.name} locale={intlLocale[await getLocale()]} selected={selectedId} rewards={rewards} rows={visibleTasks.map((item) => ({ item, edit: null }))} />)}
      {showTasks && selectedId && (
        <section className="detail-panel" aria-label={t("taskDetail.sheet")}>
          <TaskDetail id={selectedId} panel={{ edit: selected ? <a className="btn items-edit" href={`${href(quick)}&edit=${selected.id}`}>{t("items.edit")}</a> : null }} />
        </section>
      )}
      {showTasks && !selectedId && visibleTasks.length > 0 && <p className="intro">{t("items.panelEmpty")}</p>}
      {MANUAL_KINDS.filter((k) => !MANUAL_KINDS.some((m) => m === only) || k === only).filter((k) => k !== "task" && quick === "all").map((kind) => (
        <section key={kind}>
          <GroupHead title={t(`items.group.${kind}` as MessageKey)} rows={items.filter((i) => i.kind === kind && shown(i))} label={(s) => t(`risk.${s}` as MessageKey)} />
          {kind === "risk" && early > 0 && <p className="badge">{t("rewards.earlyCount").replace("{n}", String(early))}</p>}
          <ItemsTable kind={kind} t={t} rewards={rewards} columns={columns} owners={owners} rows={items.filter((i) => i.kind === kind && shown(i)).map((item) => ({ item, edit: <a className="btn items-edit" href={`${href(quick)}&edit=${item.id}`}>{t(`items.edit.${kind}` as MessageKey)}</a> }))} />
        </section>
      ))}
      <OfflineTasks
        project={project.name}
        tasks={items.filter((i) => i.kind === "task").map((i) => ({ id: i.id, title: i.title, status: i.status }))}
        labels={{ title: t("offline.quick"), hint: t("offline.hint"), status: t("board.statusLabel"), note: t("offline.note"), add: t("offline.add"), pending: t("offline.pending"), synced: t("offline.synced"), conflicts: t("offline.conflicts"), statuses: Object.fromEntries(STATUSES.map((s) => [s, t(`status.${s}` as MessageKey)])) }}
      />
      <MoreLink path="/app/items" params={{ project: project.id, ...(only ? { kind: only } : {}), ...(quick !== "all" ? { quick } : {}) }} next={next} label={t("paging.more")} />
    </main>
  );
}
