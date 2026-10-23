import { supabaseServer } from "@/auth/supabase";
import { listManualItems, listPlanChoices, type ManualItem } from "@/data/live";
import { currentProject, listMembers, listProjects, type Member } from "@/data/projects";
import { MANUAL_KINDS, PRIORITIES, RISK_KINDS, RISK_STATUSES } from "@/domain/items";
import { STATUSES } from "@/domain/board";
import { COLUMNS, matchesQuick, parseColumns, parseQuick, QUICK_FILTERS } from "@/domain/itemsView";
import { isEarlyWarning, rewardsOn } from "@/domain/rewards";
import type { MessageKey } from "@/lib/messages";
import { MoreLink } from "@/app/app/MoreLink";
import { getT } from "@/lib/locale";
import { WorkSwitch } from "@/app/WorkSwitch";
import { TaskSheet } from "../tasks/[id]/TaskSheet";
import { bulkTasks, saveItem } from "./actions";
import { OfflineTasks } from "./OfflineTasks";
import { ItemsTable } from "./ItemsTable";

type Plan = { members: Member[]; phases: { id: string; name: string }[]; tasks: { id: string; title: string }[] };

function Fields({ item, kind, projectId, plan, t }: { item?: ManualItem; kind: ManualItem["kind"]; projectId: string; plan: Plan; t: (key: MessageKey) => string }) {
  return (
    <form action={saveItem}>
      <input type="hidden" name="kind" value={kind} />
      <input type="hidden" name="projectId" value={projectId} />
      {item && <input type="hidden" name="id" value={item.id} />}
      <label>{t("link.title")} <input name="title" required defaultValue={item?.title} /></label>
      <label>{t("link.details")} <textarea name="details" maxLength={5000} defaultValue={item?.details} /></label>
      {kind === "task" && (
        <>
          <label>{t("board.statusLabel")}{" "}
            <select name="status" defaultValue={item?.status ?? "todo"}>
              {STATUSES.map((s) => <option key={s} value={s}>{t(`status.${s}`)}</option>)}
            </select>
          </label>
          <label>{t("items.priority")}{" "}
            <select name="priority" defaultValue={item?.priority || "normal"}>
              {PRIORITIES.map((p) => <option key={p} value={p}>{t(`priority.${p}`)}</option>)}
            </select>
          </label>
          <label>{t("items.start")} <input type="date" name="startDate" defaultValue={item?.startDate ?? ""} /></label>
          <label>{t("board.due")} <input type="date" name="dueDate" defaultValue={item?.dueDate ?? ""} /></label>
          <label><input type="checkbox" name="isMilestone" defaultChecked={item?.isMilestone ?? false} /> {t("items.milestone")}</label>
          <label>{t("items.costCode")} <input name="costCode" maxLength={40} defaultValue={item?.costCode ?? ""} /></label>
          <label>{t("items.site")} <input name="site" maxLength={80} defaultValue={item?.site ?? ""} /></label>
          <label>{t("items.owner")}{" "}
            <select name="ownerId" defaultValue={item?.ownerId ?? ""}>
              <option value="">{t("items.none")}</option>
              {plan.members.map((m) => <option key={m.userId} value={m.userId}>{m.name || m.email}</option>)}
            </select>
          </label>
          <label>{t("items.phase")}{" "}
            <select name="phaseId" defaultValue={item?.phaseId ?? ""}>
              <option value="">{t("items.none")}</option>
              {plan.phases.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </label>
          <label>{t("items.parent")}{" "}
            <select name="parentId" defaultValue={item?.parentId ?? ""}>
              <option value="">{t("items.none")}</option>
              {plan.tasks.filter((o) => o.id !== item?.id).map((o) => <option key={o.id} value={o.id}>{o.title}</option>)}
            </select>
          </label>
          <label>{t("items.predecessors")}{" "}
            <select name="predecessorIds" multiple defaultValue={item?.predecessorIds ?? []}>
              {plan.tasks.filter((o) => o.id !== item?.id).map((o) => <option key={o.id} value={o.id}>{o.title}</option>)}
            </select>
          </label>
        </>
      )}
      {kind === "risk" && (
        <>
          <label>{t("risk.kindLabel")}{" "}
            <select name="riskKind" defaultValue={item?.riskKind || "risk"}>
              {RISK_KINDS.map((k) => <option key={k} value={k}>{t(`kind.${k}` as MessageKey)}</option>)}
            </select>
          </label>
          <label>{t("board.statusLabel")}{" "}
            <select name="status" defaultValue={item?.status ?? "open"}>
              {RISK_STATUSES.map((s) => <option key={s} value={s}>{t(`risk.${s}`)}</option>)}
            </select>
          </label>
          <label>{t("board.due")} <input type="date" name="dueDate" defaultValue={item?.dueDate ?? ""} /></label>
          <label>{t("items.owner")}{" "}
            <select name="ownerId" defaultValue={item?.ownerId ?? ""}>
              <option value="">{t("items.none")}</option>
              {plan.members.map((m) => <option key={m.userId} value={m.userId}>{m.name || m.email}</option>)}
            </select>
          </label>
        </>
      )}
      <button type="submit">{t(item ? "items.save" : "items.create")}</button>
    </form>
  );
}

export default async function ItemsPage({ searchParams }: { searchParams: Promise<{ project?: string; after?: string; kind?: string; quick?: string; col?: string | string[]; task?: string }> }) {
  const t = await getT();
  const supabase = await supabaseServer();
  const { project: chosen, after, kind: only, quick: quickParam, col, task } = await searchParams;
  const quick = parseQuick(quickParam);
  const columns = parseColumns(col);
  const today = new Date().toISOString().slice(0, 10);
  const project = currentProject(await listProjects(supabase), chosen);
  if (!project) return <main id="main" className="page"><p>{t("projects.empty")}</p></main>;
  const [{ rows: items, next }, choices, members, { data: { user } }] = await Promise.all([listManualItems(supabase, project.id, after), listPlanChoices(supabase, project.id), listMembers(supabase, project.id), supabase.auth.getUser()]);
  const owners = Object.fromEntries(members.map((m) => [m.userId, m.name || m.email]));
  // Quick filters are about tasks, so the other kinds step aside while one is on.
  const shown = (i: ManualItem) => quick === "all" || (i.kind === "task" && matchesQuick(i, quick, user?.id ?? null, today));
  const keep = `${only ? `&kind=${only}` : ""}${col === undefined ? "" : [col].flat().map((c) => `&col=${c}`).join("")}`;
  const href = (q: string) => `/app/items?project=${project.id}${q === "all" ? "" : `&quick=${q}`}${keep}`;
  const plan = { members, ...choices };
  // Risks have no site, so only the "off everywhere" switch hides the badge.
  const [{ data: switches }, { data: risks }] = await Promise.all([
    supabase.from("reward_switches").select("site"),
    supabase.from("risks").select("created_at, due_date").neq("kind", "issue").eq("project_id", project.id),
  ]);
  const rewards = rewardsOn((switches ?? []).map((r) => r.site as string), "");
  const early = rewards ? (risks ?? []).filter((r) => isEarlyWarning(r.created_at as string, r.due_date as string | null)).length : 0;
  return (
    <main id="main" className="page">
      <p className="eyebrow">{project.name}</p>
      <h1>{t("items.title")}</h1>
      <p className="intro">{t("items.intro")}</p>
      <p><a href={`/app/import?project=${project.id}`}>{t("import.title")}</a></p>
      <WorkSwitch current="items" projectId={project.id} t={t} />
      <OfflineTasks
        project={project.name}
        tasks={items.filter((i) => i.kind === "task").map((i) => ({ id: i.id, title: i.title, status: i.status }))}
        labels={{ title: t("offline.quick"), hint: t("offline.hint"), status: t("board.statusLabel"), note: t("offline.note"), add: t("offline.add"), pending: t("offline.pending"), synced: t("offline.synced"), conflicts: t("offline.conflicts"), statuses: Object.fromEntries(STATUSES.map((s) => [s, t(`status.${s}` as MessageKey)])) }}
      />
      <nav className="items-filter" aria-label={t("items.filter.label")}>
        <div className="segmented">
          {[undefined, ...MANUAL_KINDS].map((k) => (
            <a key={k ?? "all"} href={`/app/items?project=${project.id}${k ? `&kind=${k}` : ""}`} aria-current={k === only || (!k && !MANUAL_KINDS.some((m) => m === only)) ? "page" : undefined}>{k ? t(`items.group.${k}` as MessageKey) : t("items.filter.all")}</a>
          ))}
        </div>
      </nav>
      <div className="items-tools">
        <nav className="items-quick" aria-label={t("items.quick.label")}>
          {QUICK_FILTERS.map((q) => (
            <a key={q} href={href(q)} aria-current={q === quick ? "page" : undefined}>{t(`items.quick.${q}` as MessageKey)}</a>
          ))}
        </nav>
        <details className="items-cols">
          <summary>{t("items.cols")}</summary>
          <form method="get" action="/app/items">
            <input type="hidden" name="project" value={project.id} />
            {only && <input type="hidden" name="kind" value={only} />}
            {quick !== "all" && <input type="hidden" name="quick" value={quick} />}
            <input type="hidden" name="col" value="-" />
            {COLUMNS.map((c) => <label key={c}><input type="checkbox" name="col" value={c} defaultChecked={columns.includes(c)} /> {t(`items.col.${c}` as MessageKey)}</label>)}
            <button type="submit" className="btn btn-secondary">{t("items.cols.apply")}</button>
          </form>
        </details>
      </div>
      {MANUAL_KINDS.filter((k) => !MANUAL_KINDS.some((m) => m === only) || k === only).filter((k) => quick === "all" || k === "task").map((kind) => (
        <section key={kind}>
          <h2>{t(`items.group.${kind}` as MessageKey)}</h2>
          <details>
            <summary>{t("items.new")} {t(`kind.${kind}`).toLowerCase()}</summary>
            <Fields kind={kind} projectId={project.id} plan={plan} t={t} />
          </details>
          {kind === "task" && items.some((i) => i.kind === "task") && (
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
          {kind === "risk" && early > 0 && <p className="badge">{t("rewards.earlyCount").replace("{n}", String(early))}</p>}
          {quick !== "all" && !items.some((i) => i.kind === kind && shown(i)) ? <p className="intro">{t("items.noMatch")}</p> : <ItemsTable kind={kind} t={t} sheetHref={(id) => `${href(quick)}&task=${id}`} rewards={rewards} columns={columns} owners={owners} rows={items.filter((i) => i.kind === kind && shown(i)).map((item) => ({ item, edit: <Fields item={item} kind={kind} projectId={project.id} plan={plan} t={t} /> }))} />}
        </section>
      ))}
      {task && <TaskSheet id={task} closeHref={href(quick)} />}
      <MoreLink path="/app/items" params={{ project: project.id, ...(only ? { kind: only } : {}), ...(quick !== "all" ? { quick } : {}) }} next={next} label={t("paging.more")} />
    </main>
  );
}
