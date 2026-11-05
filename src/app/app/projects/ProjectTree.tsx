"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { buildTree, type TreeParent, type TreeProject } from "@/domain/projectTree";

type Labels = Record<"search" | "parent" | "standalone" | "count" | "addTo" | "rename" | "save" | "moveTo" | "noParent" | "emptyParent" | "noMatch" | "name", string>;
type Props = {
  parents: TreeParent[];
  projects: TreeProject[];
  labels: Labels;
  canManage: boolean;
  move: (projectId: string, parentId: string | null) => Promise<boolean>;
  rename: (form: FormData) => Promise<void>;
};

// Parent projects as blocks with their projects nested below; drag a project onto a block, or use its Move list.
export function ProjectTree({ parents, projects, labels, canManage, move, rename }: Props) {
  const [q, setQ] = useState("");
  const [shut, setShut] = useState<Record<string, boolean>>({});
  const [over, setOver] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [, start] = useTransition();
  const router = useRouter();
  const blocks = buildTree(parents, projects, q);
  const doMove = (id: string, to: string | null) => start(async () => { await move(id, to); router.refresh(); });
  const key = (b: { parent: TreeParent | null }) => b.parent?.id ?? "none";
  return (
    <div className="pt-wrap">
      <input className="field" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={labels.search} aria-label={labels.search} />
      {blocks.length === 0 && <p className="pt-empty">{labels.noMatch}</p>}
      {blocks.map((b) => {
        const open = q ? true : !shut[key(b)];
        return (
          <section key={key(b)} className={`pt-block${over === key(b) ? " pt-over" : ""}${b.parent ? "" : " pt-solo"}`}
            onDragOver={canManage ? (e) => { e.preventDefault(); setOver(key(b)); } : undefined}
            onDragLeave={() => setOver(null)}
            onDrop={canManage ? (e) => { e.preventDefault(); setOver(null); const id = e.dataTransfer.getData("text/plain"); if (id) doMove(id, b.parent?.id ?? null); } : undefined}>
            <header className="pt-head">
              <button type="button" className="pt-toggle" aria-expanded={open} aria-label={b.parent?.name ?? labels.standalone} onClick={() => setShut({ ...shut, [key(b)]: open })} />
              <div className="pt-title">
                <span className="pt-tag">{b.parent ? labels.parent : labels.standalone}</span>
                {b.parent && editing === b.parent.id ? (
                  <form action={async (f) => { await rename(f); setEditing(null); }} className="inline-form">
                    <input type="hidden" name="id" value={b.parent.id} />
                    <input className="field" name="name" defaultValue={b.parent.name} aria-label={labels.name} required autoFocus />
                    <button className="btn btn-primary" type="submit">{labels.save}</button>
                  </form>
                ) : b.parent && <h2>{b.parent.name}</h2>}
              </div>
              {b.parent && <span className="pt-count">{labels.count.replace("{n}", String(b.projects.length))}</span>}
              {b.parent && canManage && editing !== b.parent.id && <button type="button" className="btn" onClick={() => setEditing(b.parent!.id)}>{labels.rename}</button>}
            </header>
            {open && (
              <ul className="pt-kids">
                {b.projects.length === 0 && <li className="pt-empty">{labels.emptyParent}</li>}
                {b.projects.map((p) => (
                  <li key={p.id} className="pt-kid" draggable={canManage} onDragStart={(e) => e.dataTransfer.setData("text/plain", p.id)}>
                    <a href={`/app?project=${p.id}`}>{p.name}</a>
                    {canManage && (
                      <select className="field" aria-label={`${labels.moveTo}: ${p.name}`} value={p.parent_id ?? ""} onChange={(e) => doMove(p.id, e.target.value || null)}>
                        <option value="">{labels.noParent}</option>
                        {parents.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
                      </select>
                    )}
                  </li>
                ))}
                {b.parent && canManage && <li className="pt-add"><a href={`/app/projects?parent=${b.parent.id}#new-project`}>{labels.addTo.replace("{name}", b.parent.name)}</a></li>}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}
