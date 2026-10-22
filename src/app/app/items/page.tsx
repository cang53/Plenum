import { supabaseServer } from "@/auth/supabase";
import { listManualItems, type ManualItem } from "@/data/live";
import { currentProject, listProjects } from "@/data/projects";
import { MANUAL_KINDS, PRIORITIES, RISK_STATUSES } from "@/domain/items";
import { STATUSES } from "@/domain/board";
import { t, type MessageKey } from "@/lib/messages";
import { saveItem } from "./actions";

function Fields({ item, kind, projectId }: { item?: ManualItem; kind: ManualItem["kind"]; projectId: string }) {
  return (
    <form action={saveItem}>
      <input type="hidden" name="kind" value={kind} />
      <input type="hidden" name="projectId" value={projectId} />
      {item && <input type="hidden" name="id" value={item.id} />}
      <label>{t("link.title")} <input name="title" required defaultValue={item?.title} /></label>
      {kind !== "task" && <label>{t("link.details")} <textarea name="details" defaultValue={item?.details} /></label>}
      {kind === "task" && (
        <>
          <label>{t("board.statusLabel")}{" "}
            <select name="status" defaultValue={item?.status ?? "todo"}>
              {STATUSES.map((s) => <option key={s} value={s}>{t(`status.${s}`)}</option>)}
            </select>
          </label>
          <label>{t("items.priority")}{" "}
            <select name="priority" defaultValue={item?.priority || "normal"}>
              {PRIORITIES.map((p) => <option key={p} value={p}>{t(`priority.${p}`)}</option>)}
            </select>
          </label>
          <label>{t("board.due")} <input type="date" name="dueDate" defaultValue={item?.dueDate ?? ""} /></label>
        </>
      )}
      {kind === "risk" && (
        <label>{t("board.statusLabel")}{" "}
          <select name="status" defaultValue={item?.status ?? "open"}>
            {RISK_STATUSES.map((s) => <option key={s} value={s}>{t(`risk.${s}`)}</option>)}
          </select>
        </label>
      )}
      <button type="submit">{t(item ? "items.save" : "items.create")}</button>
    </form>
  );
}

export default async function ItemsPage({ searchParams }: { searchParams: Promise<{ project?: string }> }) {
  const supabase = await supabaseServer();
  const project = currentProject(await listProjects(supabase), (await searchParams).project);
  if (!project) return <main className="page"><p>{t("projects.empty")}</p></main>;
  const items = await listManualItems(supabase, project.id);
  return (
    <main className="page">
      <p className="eyebrow">{project.name}</p>
      <h1>{t("items.title")}</h1>
      <p className="intro">{t("items.intro")}</p>
      {MANUAL_KINDS.map((kind) => (
        <section key={kind}>
          <h2>{t(`items.group.${kind}` as MessageKey)}</h2>
          <details>
            <summary>{t("items.new")} {t(`kind.${kind}`).toLowerCase()}</summary>
            <Fields kind={kind} projectId={project.id} />
          </details>
          <ul>
            {items.filter((i) => i.kind === kind).map((i) => (
              <li key={i.id}>
                <details>
                  <summary>{i.title}</summary>
                  <Fields item={i} kind={kind} projectId={project.id} />
                </details>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </main>
  );
}
