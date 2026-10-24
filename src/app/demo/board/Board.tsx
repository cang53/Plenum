"use client";

import { useState } from "react";
import { buildColumns, distinct, groupTasks, initials, moveTask, taskKey, type BoardTask, type GroupBy, type TaskStatus } from "@/domain/board";
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
};

const PRIORITY_DOT = { low: "st-todo", normal: "st-todo", high: "st-warn" } as const;

const FIELDS = ["priority", "phase", "due", "owner"] as const;
type Field = (typeof FIELDS)[number];
const GROUPS: readonly GroupBy[] = ["status", "phase", "owner", "week"];

export function Board({ initialTasks, onMove, onAdd, locale = "en", openBase, prefix = "T" }: Props) {
  const t = (key: MessageKey) => translate(key, locale);
  const [tasks, setTasks] = useState(initialTasks);
  const [phase, setPhase] = useState("");
  const [owner, setOwner] = useState("");
  const [site, setSite] = useState("");
  const [groupBy, setGroupBy] = useState<GroupBy>("status");
  const [hidden, setHidden] = useState<Field[]>([]);
  const shows = (field: Field) => !hidden.includes(field);
  const [dragging, setDragging] = useState<string | null>(null);

  const due = (date: string) => new Date(`${date}T00:00:00Z`).toLocaleDateString(locale, { day: "numeric", month: "short", timeZone: "UTC" });
  const statusColumns = buildColumns(tasks, { phase: phase || undefined, owner: owner || undefined, site: site || undefined });
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
      <div className="board-filters">
        <label>
          {t("board.filterPhase")}
          <select value={phase} onChange={(e) => setPhase(e.target.value)}>
            <option value="">{t("board.all")}</option>
            {distinct(tasks.map((task) => task.phase)).map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
        </label>
        <label>
          {t("board.filterOwner")}
          <select value={owner} onChange={(e) => setOwner(e.target.value)}>
            <option value="">{t("board.all")}</option>
            {distinct(tasks.map((task) => task.ownerName)).map((o) => (
              <option key={o}>{o}</option>
            ))}
          </select>
        </label>
        <label>
          {t("board.filterSite")}
          <select value={site} onChange={(e) => setSite(e.target.value)}>
            <option value="">{t("board.all")}</option>
            {distinct(tasks.map((task) => task.site)).map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
        <label>
          {t("board.groupBy")}
          <select value={groupBy} onChange={(e) => { setGroupBy(e.target.value as GroupBy); setAdding(null); }}>
            {GROUPS.map((g) => (
              <option key={g} value={g}>{t(`board.group.${g}` as MessageKey)}</option>
            ))}
          </select>
        </label>
        <details className="display-menu">
          <summary>{t("board.display")}</summary>
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
      {failed && (
        <p role="alert" className="notice">
          {t("board.saveError")}{" "}
          <button type="button" className="button" onClick={() => move(failed.id, failed.status)}>{t("app.retry")}</button>
        </p>
      )}
      <div className="board-scroll">
        <div className="board">
          {columns.map((column) => (
            <section
              key={column.key}
              className={`board-column${dragging ? " drop-ready" : ""}`}
              aria-label={column.name}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => {
                if (dragging && byStatus) move(dragging, column.key as TaskStatus);
                setDragging(null);
              }}
            >
              <h2>
                <span>{column.name} <span className="count">{column.tasks.length}</span></span>
                {byStatus && <button type="button" className="btn btn-plain" aria-label={`${t("board.add")}: ${column.name}`} onClick={() => setAdding(column.key as TaskStatus)}>+</button>}
              </h2>
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
              {column.tasks.length === 0 && adding !== column.key && <p className="empty">{t("board.empty")}</p>}
              {column.tasks.map((task) => (
                <article
                  key={task.id}
                  className="card"
                  data-dragging={dragging === task.id}
                  draggable={byStatus}
                  onDragStart={() => setDragging(task.id)}
                  onDragEnd={() => setDragging(null)}
                >
                  <span className="card-id">
                    <span>{taskKey(prefix, task.number)}</span>
                    {shows("priority") && <span className={`st ${PRIORITY_DOT[task.priority]}`}>{t(`priority.${task.priority}`)}</span>}
                  </span>
                  <h3>{openBase ? <a href={`${openBase}${task.id}`}>{task.title}</a> : task.title}</h3>
                  <span className="card-meta">
                    {task.phase && shows("phase") ? <span className="chip">{task.phase}</span> : <span />}
                    <span className="card-owner">
                      {task.dueDate && shows("due") && <span className="n">{due(task.dueDate)}</span>}
                      {task.ownerName && shows("owner") && <span className="av" role="img" aria-label={task.ownerName}>{initials(task.ownerName)}</span>}
                    </span>
                  </span>
                  {task.status === "blocked" && task.waitingOn && <span className="waiting-on">{t("board.waitingOn")}: {task.waitingOn}</span>}
                </article>
              ))}
            </section>
          ))}
        </div>
      </div>
    </>
  );
}
