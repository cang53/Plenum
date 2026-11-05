"use client";

import { useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { buildTree, type TreeParent, type TreeProject } from "@/domain/projectTree";
import { worstHealth } from "@/domain/projectStats";

type Labels = Record<"heading" | "intro" | "search" | "parent" | "standalone" | "count" | "addTo" | "rename" | "save" | "noParent" | "emptyParent" | "noMatch" | "name" | "newParent" | "newProject" | "collapse" | "expand" | "ok" | "warn" | "bad" | "done" | "next" | "noNext" | "blocked" | "move" | "moveHelp" | "cancel" | "create", string>;
type Props = {
  parents: TreeParent[];
  projects: TreeProject[];
  labels: Labels;
  workspaceId: string | null;
  move: (projectId: string, parentId: string | null) => Promise<boolean>;
  rename: (form: FormData) => Promise<void>;
  createParent: (form: FormData) => Promise<void>;
  createProject: (form: FormData) => Promise<void>;
};
type Dialog = { kind: "parent" } | { kind: "project"; parent: string } | { kind: "rename"; id: string; name: string } | { kind: "move"; id: string } | null;

const FOLDER = (
  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="M2.5 5.5A1.5 1.5 0 0 1 4 4h3.5l1.8 2H16a1.5 1.5 0 0 1 1.5 1.5v7A1.5 1.5 0 0 1 16 16H4a1.5 1.5 0 0 1-1.5-1.5z" /></svg>
);

// Parent projects as blocks with their projects nested below on a tree line; drag a project onto a block, or use its Move button.
export function ProjectTree({ parents, projects, labels, workspaceId, move, rename, createParent, createProject }: Props) {
  const [q, setQ] = useState("");
  const [shut, setShut] = useState<Record<string, boolean>>({});
  const [over, setOver] = useState<string | null>(null);
  const [dlg, setDlg] = useState<Dialog>(null);
  const [, start] = useTransition();
  const router = useRouter();
  const canManage = workspaceId !== null;
  const blocks = buildTree(parents, projects, q);
  const key = (b: { parent: TreeParent | null }) => b.parent?.id ?? "none";
  const allShut = parents.every((p) => shut[p.id]);
  const doMove = (id: string, to: string | null) => start(async () => { await move(id, to); router.refresh(); });
  const pct = (p: TreeProject) => (p.total ? Math.round(((p.done ?? 0) / p.total) * 100) : 0);
  const act = (fn: (f: FormData) => Promise<void>) => async (f: FormData) => { await fn(f); setDlg(null); };
  const form = (title: string, cta: string, action: (f: FormData) => Promise<void>, body: ReactNode) => (
    <div className="pt-modal" role="dialog" aria-modal="true" aria-label={title}>
      <form action={act(action)}>
        <h2>{title}</h2>
        {workspaceId && <input type="hidden" name="workspaceId" value={workspaceId} />}
        {body}
        <div className="pt-modal-actions"><button type="button" className="btn" onClick={() => setDlg(null)}>{labels.cancel}</button><button className="btn btn-primary" type="submit">{cta}</button></div>
      </form>
    </div>
  );
  const nameField = (v = "") => <label><span className="field-label">{labels.name}</span><input className="field" name="name" defaultValue={v} required autoFocus autoComplete="off" /></label>;
  return (
    <>
      <div className="pt-top">
        <div><h1>{labels.heading}</h1><p>{labels.intro}</p></div>
        {canManage && (
          <div className="pt-top-actions">
            <button type="button" className="btn" onClick={() => setDlg({ kind: "parent" })}>+ {labels.newParent}</button>
            <button type="button" className="btn btn-primary" onClick={() => setDlg({ kind: "project", parent: "" })}>+ {labels.newProject}</button>
          </div>
        )}
      </div>
      <div className="pt-tools">
        <input className="field" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={labels.search} aria-label={labels.search} />
        <button type="button" className="btn" onClick={() => setShut(Object.fromEntries(parents.map((p) => [p.id, !allShut])))}>{allShut ? labels.expand : labels.collapse}</button>
      </div>
      <div className="pt-list">
        {blocks.length === 0 && <p className="pt-empty">{labels.noMatch}</p>}
        {blocks.map((b) => {
          const open = q ? true : !shut[key(b)];
          const all = projects.filter((p) => (p.parent_id ?? null) === (b.parent?.id ?? null));
          const total = all.reduce((n, p) => n + (p.total ?? 0), 0);
          const done = all.reduce((n, p) => n + (p.done ?? 0), 0);
          const health = worstHealth(all.map((p) => p.health ?? "ok"));
          const percent = total ? Math.round((done / total) * 100) : 0;
          return (
            <section key={key(b)} className={`pt-block${open ? "" : " pt-shut"}${over === key(b) ? " pt-over" : ""}${b.parent ? "" : " pt-solo"}`}
              onDragOver={canManage ? (e) => { e.preventDefault(); setOver(key(b)); } : undefined}
              onDragLeave={() => setOver(null)}
              onDrop={canManage ? (e) => { e.preventDefault(); setOver(null); const id = e.dataTransfer.getData("text/plain"); if (id) doMove(id, b.parent?.id ?? null); } : undefined}>
              <header className="pt-head">
                <button type="button" className="pt-toggle" aria-expanded={open} aria-label={b.parent?.name ?? labels.standalone} onClick={() => setShut({ ...shut, [key(b)]: open })} />
                {b.parent && <span className="pt-icon">{FOLDER}</span>}
                <div className="pt-title">
                  <span className="pt-tag">{b.parent ? labels.parent : labels.standalone}</span>
                  {b.parent && <h2>{b.parent.name}</h2>}
                </div>
                {b.parent && (
                  <div className="pt-roll">
                    <span>{labels.count.replace("{n}", String(all.length))}</span>
                    <span className="pt-bar" role="img" aria-label={labels.done.replace("{n}", String(percent))}><i style={{ width: `${percent}%` }} /></span>
                    <span>{percent}%</span>
                    <span className={`pt-badge pt-${health}`}>{labels[health]}</span>
                    {canManage && <button type="button" className="btn pt-sm" onClick={() => setDlg({ kind: "rename", id: b.parent!.id, name: b.parent!.name })}>{labels.rename}</button>}
                  </div>
                )}
              </header>
              {open && (
                <ul className="pt-kids">
                  {b.projects.length === 0 && <li className="pt-empty">{labels.emptyParent}</li>}
                  {b.projects.map((p) => (
                    <li key={p.id} className="pt-kid" draggable={canManage} onDragStart={(e) => e.dataTransfer.setData("text/plain", p.id)}>
                      <div className="pt-name">
                        {canManage && <span className="pt-grip" aria-hidden="true">⋮⋮</span>}
                        <span className={`pt-dot pt-${p.health ?? "ok"}`} aria-hidden="true" />
                        <a href={`/app?project=${p.id}`}>{p.name}</a>
                      </div>
                      <div><span className={`pt-badge pt-${p.health ?? "ok"}`}>{labels[p.health ?? "ok"]}</span></div>
                      <div className="pt-meta">
                        <span className="pt-prog"><i style={{ width: `${pct(p)}%` }} /></span>
                        <span>{labels.done.replace("{n}", String(pct(p)))} · {p.next ? labels.next.replace("{name}", p.next).replace("{date}", p.nextDate ?? "") : labels.noNext}</span>
                        {(p.blocked ?? 0) > 0 && <span className="pt-chip">{labels.blocked.replace("{n}", String(p.blocked))}</span>}
                      </div>
                      {canManage && <button type="button" className="btn pt-sm" onClick={() => setDlg({ kind: "move", id: p.id })}>{labels.move}</button>}
                    </li>
                  ))}
                  {b.parent && canManage && <li className="pt-add"><button type="button" onClick={() => setDlg({ kind: "project", parent: b.parent!.id })}>+ {labels.addTo.replace("{name}", b.parent.name)}</button></li>}
                </ul>
              )}
            </section>
          );
        })}
      </div>
      {dlg?.kind === "parent" && form(labels.newParent, labels.create, createParent, nameField())}
      {dlg?.kind === "rename" && form(labels.rename, labels.save, rename, <><input type="hidden" name="id" value={dlg.id} />{nameField(dlg.name)}</>)}
      {dlg?.kind === "project" && form(labels.newProject, labels.create, createProject, <>{nameField()}<label><span className="field-label">{labels.parent}</span><select className="field" name="parentId" defaultValue={dlg.parent}><option value="">{labels.noParent}</option>{parents.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></label></>)}
      {dlg?.kind === "move" && (
        <div className="pt-modal" role="dialog" aria-modal="true" aria-label={labels.move}>
          <div>
            <h2>{labels.move}: {projects.find((p) => p.id === dlg.id)?.name}</h2>
            <p className="pt-empty">{labels.moveHelp}</p>
            <div className="pt-options">
              {parents.map((x) => <button key={x.id} type="button" aria-current={projects.find((p) => p.id === dlg.id)?.parent_id === x.id} onClick={() => { doMove(dlg.id, x.id); setDlg(null); }}>{x.name}</button>)}
              <button type="button" aria-current={!projects.find((p) => p.id === dlg.id)?.parent_id} onClick={() => { doMove(dlg.id, null); setDlg(null); }}>{labels.noParent}</button>
            </div>
            <div className="pt-modal-actions"><button type="button" className="btn" onClick={() => setDlg(null)}>{labels.cancel}</button></div>
          </div>
        </div>
      )}
    </>
  );
}
