import type { LibraryDoc } from "@/data/library";
import { excerpt } from "@/domain/library";
import { sizeLabel } from "@/domain/attachments";
import type { MessageKey } from "@/lib/messages";

type Act = (form: FormData) => void | Promise<void>;
type Props = { t: (key: MessageKey) => string; locale: string; project: { name: string }; workspaceId: string; lessons: LibraryDoc[]; staff: boolean; add: Act; remove: Act };

// The Library screen. For now one shared folder: lessons learned, common to every project of the workspace.
export function LibraryView({ t, locale, project, workspaceId, lessons, staff, add, remove }: Props) {
  const date = (iso: string) => new Date(iso).toLocaleDateString(locale);
  return (
    <main id="main" className="page">
      <div className="rk-head"><div><p className="eyebrow">{project.name}</p><h1>{t("app.library")}</h1><p className="sub">{t("library.subtitle")}</p></div></div>
      <section className="surface rk-card" aria-labelledby="lib-l">
        <div className="rk-card-top"><h2 id="lib-l">{t("library.lessons")}</h2><span className="rk-tag">{t("library.shared")}</span></div>
        <p className="meta">{t("library.lessonsHint")}</p>
        {lessons.length === 0 ? <p>{t("library.empty")}</p> : (
          <ul className="rk-steps">
            {lessons.map((d) => (
              <li key={d.id}>
                <div className="rk-card-top"><strong>{d.title}</strong><span className="meta">{date(d.createdAt)}{d.filename ? ` · ${d.filename}` : ""}{d.sizeBytes ? ` · ${sizeLabel(d.sizeBytes)}` : ""}</span></div>
                <p>{excerpt(d.bodyText) || t("library.noText")}</p>
                {staff && <form action={remove}><input type="hidden" name="id" value={d.id} /><button type="submit" className="act">{t("library.remove")}</button></form>}
              </li>
            ))}
          </ul>
        )}
      </section>
      {staff && (
        <form action={add} className="surface rk-card" aria-labelledby="lib-add">
          <input type="hidden" name="workspaceId" value={workspaceId} />
          <h2 id="lib-add">{t("library.add")}</h2>
          <label className="rk-lab">{t("risks.newTitle")}<input name="title" className="rk-in" maxLength={200} /></label>
          <label className="rk-lab">{t("library.file")}<input type="file" name="file" className="rk-in" accept=".pdf,.docx,.txt,.md,.csv" /></label>
          <label className="rk-lab">{t("library.text")}<textarea name="text" className="rk-in" rows={5} maxLength={20000} /></label>
          <div><button type="submit" className="act act-primary">{t("library.addButton")}</button></div>
        </form>
      )}
    </main>
  );
}
