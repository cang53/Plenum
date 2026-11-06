import type { FolderNode } from "@/domain/library";
import { sizeLabel } from "@/domain/attachments";
import type { MessageKey } from "@/lib/messages";
import type { Preview } from "@/server/library-preview";

type Act = (form: FormData) => void | Promise<void>;
export type LibraryRow = { key: string; title: string; ext: string; meta: string };
type Props = {
  t: (key: MessageKey) => string;
  project: { id: string; name: string }; workspaceId: string; projectParam: string;
  at: string; heading: string; crumbs: { label: string; at: string }[];
  tree: FolderNode[]; counts: Record<string, number>;
  subfolders: FolderNode[]; rows: LibraryRow[]; selected: string | null; preview: Preview | null;
  canWrite: boolean; canCreateFolder: boolean;
  href: (at: string, file?: string | null) => string;
  actions: { add: Act; remove: Act; newFolder: Act };
};

// The Library explorer: folders on the left, the files of the open folder in the middle, a preview on the right.
export function LibraryView({ t, project, workspaceId, projectParam, at, heading, crumbs, tree, counts, subfolders, rows, selected, preview, canWrite, canCreateFolder, href, actions }: Props) {
  const isProject = at.startsWith("p:");
  const node = (n: FolderNode, depth: number): React.ReactNode => (
    <li key={n.path}>
      <a href={href(`p:${n.path}`)} aria-current={at === `p:${n.path}` ? "page" : undefined} style={{ paddingInlineStart: `${0.6 + depth * 0.9}rem` }}>{n.name}<span className="lib-n">{counts[`p:${n.path}`] ?? 0}</span></a>
      {n.children.length > 0 && <ul>{n.children.map((c) => node(c, depth + 1))}</ul>}
    </li>
  );
  return (
    <main id="main" className="page">
      <div className="rk-head"><div><h1 className="h1">{t("app.library")}</h1><p className="subline">{t("library.subtitle")}</p></div></div>
      <div className="lib">
        <nav className="panel lib-tree" aria-label={t("library.folders")}>
          <ul>
            <li><a href={href("lessons")} aria-current={at === "lessons" ? "page" : undefined}>{t("library.lessons")}<span className="lib-n">{counts.lessons ?? 0}</span></a><span className="rk-tag lib-tag">{t("library.shared")}</span></li>
            <li><a href={href("p:")} aria-current={at === "p:" ? "page" : undefined}>{t("library.projectFiles")}<span className="lib-n">{counts["p:"] ?? 0}</span></a>{tree.length > 0 && <ul>{tree.map((n) => node(n, 1))}</ul>}</li>
            <li><a href={href("stream")} aria-current={at === "stream" ? "page" : undefined}>{t("library.stream")}<span className="lib-n">{counts.stream ?? 0}</span></a></li>
          </ul>
          {canCreateFolder && isProject && (
            <form action={actions.newFolder} className="lib-new">
              <input type="hidden" name="projectId" value={project.id} /><input type="hidden" name="project" value={projectParam} /><input type="hidden" name="parent" value={at.slice(2)} />
              <label className="rk-lab">{t("library.newFolder")}<input name="name" className="rk-in" required maxLength={40} placeholder={t("library.folderName")} /></label>
              <button type="submit" className="btn btn-soft btn-sm">{t("library.createFolder")}</button>
            </form>
          )}
        </nav>

        <section className="panel lib-list" aria-labelledby="lib-h">
          <div className="rk-card-top">
            <div><h2 id="lib-h">{heading}</h2>{crumbs.length > 1 && <p className="meta lib-crumbs">{crumbs.map((c, i) => <span key={c.at}>{i > 0 && " / "}<a href={href(c.at)}>{c.label}</a></span>)}</p>}</div>
            {canWrite && (
              <details className="rk-add">
                <summary className="btn btn-primary btn-sm">+ {t("library.upload")}</summary>
                <form action={actions.add} className="rk-pop">
                  <input type="hidden" name="workspaceId" value={workspaceId} /><input type="hidden" name="project" value={projectParam} />
                  {isProject && <><input type="hidden" name="projectId" value={project.id} /><input type="hidden" name="path" value={at.slice(2)} /></>}
                  <label className="rk-lab">{t("risks.newTitle")}<input name="title" className="rk-in" maxLength={200} /></label>
                  <label className="rk-lab">{t("library.file")}<input type="file" name="file" className="rk-in" /></label>
                  <label className="rk-lab">{t("library.text")}<textarea name="text" className="rk-in" rows={4} maxLength={20000} /></label>
                  <button type="submit" className="btn btn-primary btn-sm">{t("library.addButton")}</button>
                </form>
              </details>
            )}
          </div>
          {at === "lessons" && <p className="meta">{t("library.lessonsHint")}</p>}
          {at === "stream" && <p className="meta">{t("library.streamHint")}</p>}
          <ul className="lib-rows">
            {subfolders.map((f) => <li key={f.path}><a href={href(`p:${f.path}`)} className="lib-row"><span className="lib-ext lib-dir">{t("library.dir")}</span><span className="lib-title">{f.name}</span><span className="meta">{counts[`p:${f.path}`] ?? 0}</span></a></li>)}
            {rows.map((r) => (
              <li key={r.key}><a href={href(at, r.key)} className="lib-row" aria-current={selected === r.key ? "true" : undefined}><span className="lib-ext">{r.ext}</span><span className="lib-title">{r.title}</span><span className="meta">{r.meta}</span></a></li>
            ))}
          </ul>
          {rows.length === 0 && subfolders.length === 0 && <p className="meta">{t("library.emptyFolder")}</p>}
        </section>

        <section className="panel lib-preview" aria-labelledby="lib-p">
          {!preview ? <><h2 id="lib-p">{t("library.preview")}</h2><p className="meta">{t("library.pick")}</p></> : (
            <>
              <div className="rk-card-top"><h2 id="lib-p">{preview.title}</h2><span className="lib-ext">{preview.ext}</span></div>
              <p className="meta">{[preview.filename, preview.sizeBytes ? sizeLabel(preview.sizeBytes) : "", preview.source].filter(Boolean).join(" · ")}</p>
              {/* eslint-disable-next-line @next/next/no-img-element -- signed storage URL, not optimizable */}
              {preview.kind === "image" && preview.imageUrl && <img className="lib-img" src={preview.imageUrl} alt={preview.title} />}
              {preview.kind === "text" && (preview.text ? <pre className="lib-text">{preview.text.slice(0, 6000)}{preview.text.length > 6000 ? "…" : ""}</pre> : <p className="meta">{t("library.noText")}</p>)}
              {preview.kind === "other" && <p className="meta">{t("library.noPreview")}</p>}
              <div className="rk-actions">
                {preview.downloadUrl && <a className="btn btn-soft btn-sm" href={preview.downloadUrl} target="_blank" rel="noopener noreferrer">{t("library.open")} ↗</a>}
                {canWrite && preview.key.startsWith("d:") && (
                  <form action={actions.remove}><input type="hidden" name="id" value={preview.key.slice(2)} /><input type="hidden" name="at" value={at} /><input type="hidden" name="project" value={projectParam} /><button type="submit" className="btn btn-soft btn-sm">{t("library.remove")}</button></form>
                )}
              </div>
            </>
          )}
        </section>
      </div>
    </main>
  );
}
