"use client";

import { useState, type ReactNode } from "react";
import { buildColumns, distinct, groupTasks, initials, moveTask, STATUSES, taskKey, WIP_LIMIT, type BoardTask, type DueFilter, type GroupBy, type TaskStatus } from "@/domain/board";
import { logError } from "@/lib/log";
import { t as translate, type Locale, type MessageKey } from "@/lib/messages";

type Props = {
  initialTasks: BoardTask[];
  // Saves a move; when it fails the card goes back. Without it (the demo) moves stay in the page.
  onMove?: (taskId: string, status: TaskStatus) => Promise<void>;
  // Adds a task in a column and returns the saved one. Without it (the demo) the card stays in the page.
  onAdd?: (title: string, status: TaskStatus) => Promise<BoardTask>;
  // The signed-in person's language; the demo stays English.
  locale?: Locale;
  // Start of the link a card's title leads to (the task side sheet); the task id is appended. Without it (the demo) the title is plain text.
  openBase?: string;
  // Start of every card ID, such as "P-204"; the task number follows.
  prefix?: string;
  // The Board / Timeline / Items switch; the page renders it because it is a server component.
  scope?: ReactNode;
  // Suggestions waiting for a person to accept or dismiss, and where to do that; the notice is hidden at zero.
  pending?: number;
  reviewHref?: string;
};

const PRIORITY_DOT = { low: "st-todo", normal: "st-todo", high: "st-warn" } as const;

const FIELDS = ["priority", "phase", "due", "owner"] as const;
type Field = (typeof FIELDS)[number];
const DUE_FILTERS: readonly DueFilter[] = ["overdue", "week", "none"];
const GROUPS: readonly GroupBy[] = ["status", "phase", "owner", "week"];

export function Board({ initialTasks, onMove, onAdd, locale = "en", openBase, prefix = "T", scope, pending = 0, reviewHref }: Props) {
  const t = (key: MessageKey) => translate(key, locale);
  const [tasks, setTasks] = useState(initialTasks);
  const [owner, setOwner] = useState("");
  const [dueFilter, setDueFilter] = useState<DueFilter | "">("");
  const [doneCollapsed, setDoneCollapsed] = useState(false);
  const [groupBy, setGroupBy] = useState<GroupBy>("status");
  const [hidden, setHidden] = useState<Field[]>([]);
  const shows = (field: Field) => !hidden.includes(field);
  const [dragging, setDragging] = useState<string | null>(null);
  const [menu, setMenu] = useState<string | null>(null);

  const today = new Date().toISOString().slice(0, 10);
  const soonDate = new Date(Date.parse(today) + 2 * 86_400_000).toISOString().slice(0, 10);
  const due = (date: string) => new Date(`${date}T00:00:00Z`).toLocaleDateString(locale, { day: "numeric", month: "short", timeZone: "UTC" });
  const statusColumns = buildColumns(tasks, { owner: owner || undefined, due: dueFilter || undefined, today });
  const byStatus = groupBy === "status";
  const label = (key: string) =>
    key === ""
      ? t(`board.none.${groupBy}` as MessageKey)
      : groupBy === "week"
        ? `${t("board.weekOf")} ${due(key)}`
        : key;
  const columns = byStatus
    ? statusColumns.map((c) => ({ key: c.status, name: t(`status.${c.status}`), tasks: c.tasks }))
    : groupTasks(statusColumns.flatMap((c) => c.tasks), groupBy).map((g) => ({ key: g.key, name: label(g.key), tasks: g.tasks }));
  const [failed, setFailed] = useState<{ id: string; status: TaskStatus } | null>(null);
  const move = (id: string, status: TaskStatus) => {
    const before = tasks;
    setTasks((current) => moveTask(current, id, status));
    setFailed(null);
    onMove?.(id, status).catch((error) => {
      logError("board save failed", error);
      setTasks(before);
      setFailed({ id, status });
    });
  };

  const [adding, setAdding] = useState<TaskStatus | null>(null);
  const [addFailed, setAddFailed] = useState(false);
  const add = async (form: FormData, status: TaskStatus) => {
    const title = String(form.get("title") ?? "").trim();
    if (!title) return;
    setAddFailed(false);
    try {
      const task = onAdd
        ? await onAdd(title, status)
        : { id: `demo-${tasks.length + 1}`, title, status, phase: null, ownerName: null, dueDate: null, priority: "normal" as const, position: tasks.length, number: Math.max(0, ...tasks.map((x) => x.number)) + 1, site: null };
      setTasks((current) => [...current, task]);
      setAdding(null);
    } catch (error) {
      logError("board add failed", error);
      setAddFailed(true);
    }
  };

  return (
    <>
      <div className="board-filters" role="group" aria-label={t("board.filters")}>
        <div className="board-view-filters">
        {scope}
        <select className="chip-select" aria-label={t("board.groupBy")} value={groupBy} onChange={(e) => { setGroupBy(e.target.value as GroupBy); setAdding(null); }}>
          {GROUPS.map((g) => (
            <option key={g} value={g}>{t("board.groupBy")}: {t(`board.group.${g}` as MessageKey)}</option>
          ))}
        </select>
        <select className="chip-select" aria-label={t("board.filterOwner")} value={owner} onChange={(e) => setOwner(e.target.value)}>
          <option value="">{t("board.filterOwner")}</option>
          {distinct(tasks.map((task) => task.ownerName)).map((o) => (
            <option key={o}>{o}</option>
          ))}
        </select>
        <select className="chip-select" aria-label={t("board.filterDue")} value={dueFilter} onChange={(e) => setDueFilter(e.target.value as DueFilter | "")}>
          <option value="">{t("board.filterDue")}</option>
          {DUE_FILTERS.map((d) => (
            <option key={d} value={d}>{t(`board.due.${d}` as MessageKey)}</option>
          ))}
        </select>
        <details className="display-menu">
          <summary className="chip-select">{t("board.display")}</summary>
          <div>
            {FIELDS.map((f) => (
              <label key={f}>
                <input type="checkbox" checked={shows(f)} onChange={() => setHidden((h) => (h.includes(f) ? h.filter((x) => x !== f) : [...h, f]))} />
                {t(`board.field.${f}` as MessageKey)}
              </label>
            ))}
          </div>
        </details>
        </div>
        <span className="board-count">{t("board.count").replace("{n}", String(columns.reduce((n, c) => n + c.tasks.length, 0)))}</span>
      </div>
      {pending > 0 && reviewHref && (
        <div className="board-notice" role="status">
          <span className="board-notice-text"><span aria-hidden="true">✦</span>{t("board.pending").replace("{n}", String(pending))}</span>
          <a className="act" href={reviewHref}>{t("overview.review").replace("{n}", String(pending))}</a>
        </div>
      )}
      {failed && (
        <p role="alert" className="notice">
          {t("board.saveError")}{" "}
          <button type="button" className="button" onClick={() => move(failed.id, failed.status)}>{t("app.retry")}</button>
        </p>
      )}
      <div className="board-scroll">
        <div className="board">
          {columns.map((column) => {
            const wip = byStatus && column.key === "in_progress";
            const isDone = byStatus && column.key === "done";
            const cards = isDone && doneCollapsed ? [] : column.tasks;
            return (
            <section
              key={column.key}
              className={`board-column${dragging ? " drop-ready" : ""}`}
              data-status={byStatus ? column.key : undefined}
              aria-label={column.name}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => {
                if (dragging && byStatus) move(dragging, column.key as TaskStatus);
                setDragging(null);
              }}
            >
              <h2>
                <span className="column-title">
                  <span className="column-name">{column.name}</span>
                  <span className={`count${wip && column.tasks.length > WIP_LIMIT ? " over" : ""}`}>{wip ? t("board.wip").replace("{n}", String(column.tasks.length)).replace("{max}", String(WIP_LIMIT)) : column.tasks.length}</span>
                </span>
                {byStatus && isDone && <button type="button" className="act" aria-expanded={!doneCollapsed} onClick={() => setDoneCollapsed(!doneCollapsed)}>{t(doneCollapsed ? "board.expand" : "board.collapse")}</button>}
              </h2>
              {cards.length === 0 && adding !== column.key && !(isDone && doneCollapsed) && <p className="empty">{t("board.empty")}</p>}
              {cards.map((task) => {
                const open = menu === task.id;
                const overdue = Boolean(task.dueDate) && task.status !== "done" && (task.dueDate as string) < today;
                const soon = Boolean(task.dueDate) && !overdue && task.status !== "done" && (task.dueDate as string) <= soonDate;
                return (
                <article
                  key={task.id}
                  className={`card${overdue ? " overdue" : ""}`}
                  data-dragging={dragging === task.id}
                  draggable={byStatus}
                  onDragStart={() => setDragging(task.id)}
                  onDragEnd={() => setDragging(null)}
                  onKeyDown={(e) => e.key === "Escape" && setMenu(null)}
                >
                  <div className="card-top">
                    <span className="card-id">
                      <span>{taskKey(prefix, task.number)}</span>
                      {task.phase && shows("phase") && <span>{task.phase}</span>}
                      {shows("priority") && task.priority !== "normal" && <span className={`st ${PRIORITY_DOT[task.priority]}`}>{t(`priority.${task.priority}`)}</span>}
                    </span>
                    <button type="button" className="act" aria-label={`${t("board.menu")}: ${task.title}`} aria-expanded={open} aria-controls={`menu-${task.id}`} onClick={() => setMenu(open ? null : task.id)}>···</button>
                  </div>
                  <h3>{openBase ? <a href={`${openBase}${task.id}`}>{task.title}</a> : task.title}</h3>
                  {task.status === "blocked" && task.waitingOn ? <p className="card-note waiting-on">{t("board.waitingOn")}: {task.waitingOn}</p> : task.site && <p className="card-note">{task.site}</p>}
                  {task.ownerName && shows("owner") && (
                    <span className="card-owner">
                      <span className="av" role="img" aria-label={task.ownerName}>{initials(task.ownerName)}</span>
                      <span>{task.ownerName}</span>
                    </span>
                  )}
                  {task.dueDate && shows("due") && (
                    <span className={`card-due${overdue ? " overdue" : soon ? " soon" : ""}`}>
                      <span>{overdue ? t("board.due.overdue") : t("board.due")}</span>
                      <span>{due(task.dueDate)}</span>
                    </span>
                  )}
                  {/* The non-drag way to move a card, for keyboard and touch. */}
                  {open && (
                    <div className="card-menu" id={`menu-${task.id}`} role="group" aria-label={t("board.statusLabel")}>
                      {STATUSES.map((s) => (
                        <button key={s} type="button" className="act" aria-pressed={task.status === s} onClick={() => { move(task.id, s); setMenu(null); }}>{t(`status.${s}`)}</button>
                      ))}
                      <p>{t("board.menuHint")}</p>
                    </div>
                  )}
                </article>
                );
              })}
              {adding === column.key && (
                <form className="board-add" action={(form) => add(form, column.key as TaskStatus)} onKeyDown={(e) => e.key === "Escape" && setAdding(null)}>
                  <input className="field" name="title" required autoFocus aria-label={t("board.addTitle")} placeholder={t("board.addTitle")} />
                  {addFailed && <p role="alert" className="field-error">{t("board.addError")}</p>}
                  <span className="board-add-actions">
                    <button className="btn btn-primary" type="submit">{t("board.addSubmit")}</button>
                    <button className="btn btn-plain" type="button" onClick={() => setAdding(null)}>{t("board.addCancel")}</button>
                  </span>
                </form>
              )}
              {byStatus && !isDone && adding !== column.key && <button type="button" className="add-task" onClick={() => setAdding(column.key as TaskStatus)}>{t("board.add")}</button>}
            </section>
            );
          })}
        </div>
      </div>
      <div className="board-footer">
        <span>{t("board.footerDrag")}</span>
        <span className="board-saved">{t("board.footer")}</span>
      </div>
    </>
  );
}
