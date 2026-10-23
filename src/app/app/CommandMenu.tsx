"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { isMenuKey, matchActions, stepActive, type MenuAction } from "@/domain/commandMenu";
import { searchHref } from "@/domain/search";

type Labels = Record<"open" | "title" | "placeholder" | "actions" | "results" | "empty" | "newTask" | "search" | "task" | "message" | "decision", string>;
type Hit = { kind: "task" | "message" | "decision"; id: string; title: string };
type Row = { key: string; label: string; tag?: string; href: string };

// Cmd or Ctrl plus K: run an action or jump to a task or project message, using the existing project search.
export function CommandMenu({ project, labels }: { project?: string; labels: Labels }) {
  const router = useRouter();
  const dialog = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const list = useId();
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [active, setActive] = useState(0);
  const withProject = (path: string) => (project ? `${path}?project=${encodeURIComponent(project)}` : path);
  const actions: MenuAction[] = [
    { id: "newTask", label: labels.newTask, href: withProject("/app/items") },
    { id: "search", label: labels.search, href: withProject("/app/search") },
  ];
  const rows: Row[] = [
    ...matchActions(actions, q).map((a) => ({ key: a.id, label: a.label, href: a.href })),
    ...hits.map((h) => ({ key: `${h.kind}-${h.id}`, label: h.title, tag: labels[h.kind], href: searchHref(project ?? "", h.kind) })),
  ];

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!isMenuKey(e)) return;
      e.preventDefault();
      if (dialog.current?.open) dialog.current.close();
      else dialog.current?.showModal();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!project || !q.trim()) return;
    const ctl = new AbortController();
    const timer = setTimeout(() => {
      fetch(`/app/search/hits?project=${encodeURIComponent(project)}&q=${encodeURIComponent(q)}`, { signal: ctl.signal })
        .then((r) => (r.ok ? r.json() : []))
        .then(setHits)
        .catch(() => {});
    }, 200);
    return () => { clearTimeout(timer); ctl.abort(); };
  }, [q, project]);

  const reset = () => { setQ(""); setHits([]); setActive(0); };
  const go = (row?: Row) => { if (!row) return; dialog.current?.close(); router.push(row.href); };
  const onInput = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); setActive(stepActive(active, e.key === "ArrowDown" ? 1 : -1, rows.length)); }
    else if (e.key === "Enter") { e.preventDefault(); go(rows[active]); }
  };

  return (
    <>
      <button type="button" className="btn btn-secondary" onClick={() => dialog.current?.showModal()} aria-keyshortcuts="Control+K Meta+K">
        {labels.open} <kbd className="kbd" aria-hidden="true">⌘K</kbd>
      </button>
      <dialog ref={dialog} className="dialog cmd" aria-label={labels.title} onClose={reset} onToggle={(e) => (e.target as HTMLDialogElement).open && input.current?.focus()}>
        <input
          ref={input}
          className="field"
          role="combobox"
          aria-expanded="true"
          aria-controls={list}
          aria-activedescendant={rows[active] ? `${list}-${rows[active].key}` : undefined}
          aria-label={labels.placeholder}
          placeholder={labels.placeholder}
          value={q}
          maxLength={200}
          autoComplete="off"
          onChange={(e) => { setQ(e.target.value); setActive(0); if (!e.target.value.trim()) setHits([]); }}
          onKeyDown={onInput}
        />
        <ul id={list} role="listbox" aria-label={labels.results} className="cmd-list">
          {rows.map((r, i) => (
            <li key={r.key} id={`${list}-${r.key}`} role="option" aria-selected={i === active} onMouseMove={() => setActive(i)} onClick={() => go(r)}>
              <span>{r.label}</span>
              {r.tag && <span className="chip">{r.tag}</span>}
            </li>
          ))}
        </ul>
        {rows.length === 0 && <p className="cmd-empty">{labels.empty}</p>}
      </dialog>
    </>
  );
}
