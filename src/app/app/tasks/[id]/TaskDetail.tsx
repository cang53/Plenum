import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { supabaseServer } from "@/auth/supabase";
import { taskActivity } from "@/data/live";
import { listMembers } from "@/data/projects";
import { initials, projectPrefix, taskKey } from "@/domain/board";
import { activityKey, checklistProgress } from "@/domain/taskDetail";
import { getLocale, getT } from "@/lib/locale";
import { intlLocale, type MessageKey } from "@/lib/messages";
import { addCheck, removeCheck, toggleCheck } from "./actions";

type Row = { id: string; title: string };

// The task's content, shared by the page, the side sheet (which passes where "Close" goes) and the Items panel (which passes the edit form).
export async function TaskDetail({ id, closeHref, panel }: { id: string; closeHref?: string; panel?: { edit: ReactNode } }) {
  const t = await getT();
  const locale = intlLocale[await getLocale()];
  const supabase = await supabaseServer();
  const { data: task } = await supabase.from("tasks").select("id, project_id, title, details, status, priority, start_date, due_date, owner_id, source_message_id, number, phases(name), projects(name)").eq("id", id).maybeSingle();
  if (!task) return closeHref ? null : notFound();
  const [members, checks, before, after, activity, canEdit] = await Promise.all([
    listMembers(supabase, task.project_id),
    supabase.from("task_checklist").select("id, text, done").eq("task_id", id).order("position").order("created_at"),
    supabase.from("task_dependencies").select("tasks:predecessor_id(id, title)").eq("successor_id", id),
    supabase.from("task_dependencies").select("tasks:successor_id(id, title)").eq("predecessor_id", id),
    taskActivity(supabase, id),
    supabase.rpc("can_manage_project", { p: task.project_id }),
  ]);
  const list = (checks.data ?? []) as { id: string; text: string; done: boolean }[];
  const { done, total } = checklistProgress(list);
  const owner = members.find((m) => m.userId === task.owner_id);
  const tasksOf = (rows: unknown) => ((rows ?? []) as { tasks: Row | null }[]).flatMap((r) => (r.tasks ? [r.tasks] : []));
  const date = new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  const day = (d: string | null) => (d ? new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", year: "numeric" }).format(new Date(d)) : t("items.none"));
  const mayEdit = canEdit.data === true || task.owner_id === (await supabase.auth.getUser()).data.user?.id;
  const links = (rows: Row[]) => (rows.length ? <ul>{rows.map((r) => <li key={r.id}><a href={`/app/tasks/${r.id}`}>{r.title}</a></li>)}</ul> : <p className="sub">{t("items.none")}</p>);
  const key = taskKey(projectPrefix((task.projects as unknown as { name: string } | null)?.name ?? ""), task.number);
  const status = task.status as string;
  const deps = (
    <section aria-labelledby="td-dep">
      <h2 id="td-dep">{t("taskDetail.dependencies")}</h2>
      <h3>{t("taskDetail.dependsOn")}</h3>{links(tasksOf(before.data))}
      <h3>{t("taskDetail.blocks")}</h3>{links(tasksOf(after.data))}
    </section>
  );
  const props = (
    <aside aria-labelledby="td-props" className="td-props">
      <h2 id="td-props">{t("taskDetail.properties")}</h2>
      <dl>
        <dt>{t("board.statusLabel")}</dt><dd>{t(`status.${task.status}` as MessageKey)}</dd>
        <dt>{t("items.owner")}</dt><dd>{owner ? <><span className="av" aria-hidden="true">{initials(owner.name || owner.email)}</span> {owner.name || owner.email}</> : t("items.none")}</dd>
        <dt>{t("items.phase")}</dt><dd>{(task.phases as unknown as { name: string } | null)?.name ?? t("items.none")}</dd>
        <dt>{t("items.priority")}</dt><dd>{t(`priority.${task.priority}` as MessageKey)}</dd>
        <dt>{t("items.start")}</dt><dd>{day(task.start_date)}</dd>
        <dt>{t("board.due")}</dt><dd>{day(task.due_date)}</dd>
      </dl>
      {panel && deps}
      {task.source_message_id && <p><a href={`/app/stream#msg-${task.source_message_id}`}>{t("taskDetail.sourceMessage")}</a></p>}
    </aside>
  );
  return (
    <>
      {panel ? (
        <header className="dp-head">
          <div><span className="id">{key}</span><h2 className="td-title">{task.title}</h2></div>
          <span className={`st ${status === "blocked" ? "st-bad" : status === "done" ? "st-ok" : status === "in_progress" ? "st-go" : "st-todo"}`}>{t(`status.${task.status}` as MessageKey)}</span>
        </header>
      ) : closeHref ? <p className="sub"><a href={closeHref} data-close>{t("taskDetail.close")}</a></p> : <p className="sub"><a href="/app/items">{t("taskDetail.back")}</a></p>}
      {panel ? null : closeHref ? <h2 className="td-title">{task.title}</h2> : <h1><span className="id">{key}</span> {task.title}</h1>}
      <div className={panel ? "td-cols dp-cols" : "td-cols"}>
        <div>
          <section aria-labelledby="td-desc">
            <h2 id="td-desc">{t("link.details")}</h2>
            <p className="text">{task.details || t("taskDetail.noDetails")}</p>
          </section>
          <section aria-labelledby="td-check">
            <h2 id="td-check">{t("taskDetail.checklist")} <span className="sub">{done}/{total}</span></h2>
            <ul className="td-list">
              {list.map((c) => (
                <li key={c.id}>
                  <form action={toggleCheck}>
                    <input type="hidden" name="id" value={c.id} /><input type="hidden" name="taskId" value={id} /><input type="hidden" name="done" value={String(!c.done)} />
                    <button className="btn-plain" disabled={!mayEdit} aria-pressed={c.done}>{c.done ? "☑" : "☐"} <span className="sr-only">{t(c.done ? "taskDetail.untick" : "taskDetail.tick")}: </span><span className={c.done ? "td-done" : undefined}>{c.text}</span></button>
                  </form>
                  {mayEdit && <form action={removeCheck}><input type="hidden" name="id" value={c.id} /><input type="hidden" name="taskId" value={id} /><button className="btn-plain" aria-label={`${t("taskDetail.remove")}: ${c.text}`}>×</button></form>}
                </li>
              ))}
            </ul>
            {mayEdit && (
              <form action={addCheck} className="inline-form">
                <input type="hidden" name="taskId" value={id} />
                <label className="sr-only" htmlFor="td-new">{t("taskDetail.newItem")}</label>
                <input id="td-new" className="field" name="text" required maxLength={300} placeholder={t("taskDetail.newItem")} />
                <button className="btn btn-secondary">{t("taskDetail.add")}</button>
              </form>
            )}
          </section>
          {!panel && deps}
          <section aria-labelledby="td-act">
            <h2 id="td-act">{t("taskDetail.activity")}</h2>
            <ul className="td-list">
              {activity.map((a, i) => (
                <li key={i}>
                  <span className="sub">{date.format(new Date(a.at))}</span> {a.who ?? t("taskDetail.someone")} {t(activityKey(a.action) as MessageKey)}
                  {a.messageId && <> · <a href={`/app/stream#msg-${a.messageId}`}>{a.subject || t("taskDetail.sourceMessage")}</a></>}
                </li>
              ))}
            </ul>
          </section>
          {panel?.edit}
        </div>
        {props}
      </div>
    </>
  );
}
