"use client";

import { useState } from "react";
import { buildColumns, distinct, initials, moveTask, STATUSES, taskKey, type BoardTask, type TaskStatus } from "@/domain/board";
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
};

const PRIORITY_DOT = { low: "st-todo", normal: "st-todo", high: "st-warn" } as const;

export function Board({ initialTasks, onMove, onAdd, locale = "en" }: Props) {
  const t = (key: MessageKey) => translate(key, locale);
  const [tasks, setTasks] = useState(initialTasks);
  const [phase, setPhase] = useState("");
  const [owner, setOwner] = useState("");
  const [site, setSite] = useState("");
  const [dragging, setDragging] = useState<string | null>(null);

  const columns = buildColumns(tasks, { phase: phase || undefined, owner: owner || undefined, site: site || undefined });
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
        : { id: `demo-${tasks.length + 1}`, title, status, phase: null, ownerName: null, dueDate: null, priority: "normal" as const, position: tasks.length, site: null };
      setTasks((current) => [...current, task]);
      setAdding(null);
    } catch (error) {
      logError("board add failed", error);
      setAddFailed(true);
    }
  };
  const due = (date: string) => new Date(`${date}T00:00:00Z`).toLocaleDateString(locale, { day: "numeric", month: "short", timeZone: "UTC" });

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
              key={column.status}
              className={`board-column${dragging ? " drop-ready" : ""}`}
              aria-label={t(`status.${column.status}`)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => {
                if (dragging) move(dragging, column.status);
                setDragging(null);
              }}
            >
              <h2>
                <span>{t(`status.${column.status}`)} <span className="count">{column.tasks.length}</span></span>
                <button type="button" className="btn btn-plain" aria-label={`${t("board.add")}: ${t(`status.${column.status}`)}`} onClick={() => setAdding(column.status)}>+</button>
              </h2>
              {adding === column.status && (
                <form className="board-add" action={(form) => add(form, column.status)} onKeyDown={(e) => e.key === "Escape" && setAdding(null)}>
                  <input className="field" name="title" required autoFocus aria-label={t("board.addTitle")} placeholder={t("board.addTitle")} />
                  {addFailed && <p role="alert" className="field-error">{t("board.addError")}</p>}
                  <span className="board-add-actions">
                    <button className="btn btn-primary" type="submit">{t("board.addSubmit")}</button>
                    <button className="btn btn-plain" type="button" onClick={() => setAdding(null)}>{t("board.addCancel")}</button>
                  </span>
                </form>
              )}
              {column.tasks.length === 0 && adding !== column.status && <p className="empty">{t("board.empty")}</p>}
              {column.tasks.map((task) => (
                <article
                  key={task.id}
                  className="card"
                  data-dragging={dragging === task.id}
                  draggable
                  onDragStart={() => setDragging(task.id)}
                  onDragEnd={() => setDragging(null)}
                >
                  <span className="card-id">
                    <span>{taskKey(task.id)}</span>
                    <span className={`st ${PRIORITY_DOT[task.priority]}`}>{t(`priority.${task.priority}`)}</span>
                  </span>
                  <h3>{task.title}</h3>
                  <span className="card-meta">
                    {task.phase ? <span className="chip">{task.phase}</span> : <span />}
                    <span className="card-owner">
                      {task.dueDate && <span className="n">{due(task.dueDate)}</span>}
                      {task.ownerName && <span className="av" role="img" aria-label={task.ownerName}>{initials(task.ownerName)}</span>}
                    </span>
                  </span>
                  <label className="status-select">
                    {t("board.statusLabel")}
                    <select value={task.status} onChange={(e) => move(task.id, e.target.value as TaskStatus)}>
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {t(`status.${s}`)}
                        </option>
                      ))}
                    </select>
                  </label>
                </article>
              ))}
            </section>
          ))}
        </div>
      </div>
    </>
  );
}
