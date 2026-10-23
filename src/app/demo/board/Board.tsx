"use client";

import { useState } from "react";
import { buildColumns, distinct, moveTask, STATUSES, type BoardTask, type TaskStatus } from "@/domain/board";
import { logError } from "@/lib/log";
import { t as translate, type Locale, type MessageKey } from "@/lib/messages";

type Props = {
  initialTasks: BoardTask[];
  // Saves a move; when it fails the card goes back. Without it (the demo) moves stay in the page.
  onMove?: (taskId: string, status: TaskStatus) => Promise<void>;
  // The signed-in person's language; the demo stays English.
  locale?: Locale;
};

const STATUS_BADGE: Record<TaskStatus, string> = { todo: "", in_progress: "badge-info", blocked: "badge-danger", done: "badge-success" };

export function Board({ initialTasks, onMove, locale = "en" }: Props) {
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
              className={`board-column surface${dragging ? " drop-ready" : ""}`}
              aria-label={t(`status.${column.status}`)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => {
                if (dragging) move(dragging, column.status);
                setDragging(null);
              }}
            >
              <h2>
                {t(`status.${column.status}`)} <span className="count">{column.tasks.length}</span>
              </h2>
              {column.tasks.length === 0 && <p className="empty">{t("board.empty")}</p>}
              {column.tasks.map((task) => (
                <article
                  key={task.id}
                  className="card"
                  data-dragging={dragging === task.id}
                  draggable
                  onDragStart={() => setDragging(task.id)}
                  onDragEnd={() => setDragging(null)}
                >
                  <span className="card-grip" aria-hidden="true">⠿</span>
                  <h3>{task.title}</h3>
                  <p className="meta">
                    {[task.phase, task.ownerName].filter(Boolean).join(" · ")}
                  </p>
                  <p className="card-badges">
                    <span className={`badge ${STATUS_BADGE[task.status]}`}>{t(`status.${task.status}`)}</span>
                    <span className={`badge ${task.priority === "high" ? "badge-warning" : ""}`}>{t(`priority.${task.priority}`)}</span>
                    {task.dueDate && <span className="badge">{t("board.due")} {task.dueDate}</span>}
                  </p>
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
