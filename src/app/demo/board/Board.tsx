"use client";

import { useState } from "react";
import { buildColumns, distinct, moveTask, STATUSES, type BoardTask, type TaskStatus } from "@/domain/board";
import { t } from "@/lib/messages";

export function Board({ initialTasks }: { initialTasks: BoardTask[] }) {
  const [tasks, setTasks] = useState(initialTasks);
  const [phase, setPhase] = useState("");
  const [owner, setOwner] = useState("");
  const [dragging, setDragging] = useState<string | null>(null);

  const columns = buildColumns(tasks, { phase: phase || undefined, owner: owner || undefined });
  const move = (id: string, status: TaskStatus) => setTasks((current) => moveTask(current, id, status));

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
      </div>
      <div className="board-scroll">
        <div className="board">
          {columns.map((column) => (
            <section
              key={column.status}
              className="board-column"
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
                  draggable
                  onDragStart={() => setDragging(task.id)}
                  onDragEnd={() => setDragging(null)}
                >
                  <h3>{task.title}</h3>
                  <p className="meta">
                    {[task.phase, task.ownerName].filter(Boolean).join(" · ")}
                  </p>
                  {task.dueDate && (
                    <p className="meta">
                      {t("board.due")} {task.dueDate}
                    </p>
                  )}
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
