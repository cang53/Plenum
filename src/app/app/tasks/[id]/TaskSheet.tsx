import { supabaseServer } from "@/auth/supabase";
import { listPlanChoices } from "@/data/live";
import { listMembers } from "@/data/projects";
import { PRIORITIES } from "@/domain/items";
import { STATUSES, projectPrefix, taskKey } from "@/domain/board";
import { getLocale, getT } from "@/lib/locale";
import { intlLocale, type MessageKey } from "@/lib/messages";
import { SheetKeys } from "./SheetKeys";
import { saveInspector } from "./actions";

type Source = { subject: string; from_name: string | null; from_address: string; received_at: string };
type Suggestion = { id: string; title: string; details: string; status: "pending" | "accepted" | "dismissed" };

// The task inspector beside the Board; `closeHref` is the same page without the task.
export async function TaskSheet({ id, closeHref }: { id: string; closeHref: string }) {
  const t = await getT();
  const locale = intlLocale[await getLocale()];
  const supabase = await supabaseServer();
  const { data: task } = await supabase.from("tasks").select("id, project_id, title, details, status, priority, start_date, due_date, owner_id, phase_id, parent_id, cost_code, site, is_milestone, source_message_id, number, projects(name), source:messages!source_message_id(subject, from_name, from_address, received_at)").eq("id", id).maybeSingle();
  if (!task) return null;
  const [members, plan, deps, suggestion, canEdit, user] = await Promise.all([
    listMembers(supabase, task.project_id),
    listPlanChoices(supabase, task.project_id),
    supabase.from("task_dependencies").select("predecessor_id").eq("successor_id", id),
    task.source_message_id ? supabase.from("suggestions").select("id, title, details, status").eq("message_id", task.source_message_id).maybeSingle() : Promise.resolve({ data: null }),
    supabase.rpc("can_manage_project", { p: task.project_id }),
    supabase.auth.getUser(),
  ]);
  const mayEdit = canEdit.data === true || task.owner_id === user.data.user?.id;
  const source = task.source as unknown as Source | null;
  const ai = suggestion.data as Suggestion | null;
  const key = taskKey(projectPrefix((task.projects as unknown as { name: string } | null)?.name ?? ""), task.number);
  const when = source ? new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(source.received_at)) : "";
  const sender = source ? source.from_name || source.from_address : "";
  const field = (label: string, control: React.ReactNode, wide = true) => (
    <label className={`insp-field${wide ? "" : " half"}`}><span>{label}</span>{control}</label>
  );
  const none = <option value="">{t("items.none")}</option>;
  return (
    <aside className="inspector" aria-label={t("taskDetail.sheet")}>
      <SheetKeys closeHref={closeHref} />
      <form action={saveInspector} className="insp-body">
        <input type="hidden" name="kind" value="task" />
        <input type="hidden" name="id" value={task.id} />
        <input type="hidden" name="closeHref" value={closeHref} />
        <input type="hidden" name="site" value={task.site ?? ""} />
        {task.is_milestone && <input type="hidden" name="isMilestone" value="on" />}
        {(deps.data ?? []).map((d) => <input key={d.predecessor_id} type="hidden" name="predecessorIds" value={d.predecessor_id} />)}
        <header className="insp-head">
          <div>
            <h2>{task.title}</h2>
            <p>{key} · {t(`status.${task.status}` as MessageKey)}</p>
          </div>
          <a className="insp-close" href={closeHref} data-close aria-label={t("taskDetail.close")}>✕</a>
        </header>
        <div className="insp-scroll">
          <fieldset disabled={!mayEdit} className="insp-section">
            <legend>{t("taskDetail.sheet")}</legend>
            {field(t("link.title"), <input name="title" required defaultValue={task.title} />)}
            {field(t("items.phase"), <select name="phaseId" defaultValue={task.phase_id ?? ""}>{none}{plan.phases.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>)}
            {field(t("items.parent"), <select name="parentId" defaultValue={task.parent_id ?? ""}>{none}{plan.tasks.filter((o) => o.id !== task.id).map((o) => <option key={o.id} value={o.id}>{o.title}</option>)}</select>)}
            {field(t("items.owner"), <select name="ownerId" defaultValue={task.owner_id ?? ""}>{none}{members.map((m) => <option key={m.userId} value={m.userId}>{m.name || m.email}</option>)}</select>)}
            {field(t("items.costCode"), <input name="costCode" maxLength={40} defaultValue={task.cost_code ?? ""} />)}
            <label className="insp-field"><span>{t("taskDetail.description")}</span><textarea name="details" maxLength={5000} defaultValue={task.details ?? ""} /></label>
          </fieldset>
          <fieldset disabled={!mayEdit} className="insp-section">
            <legend>{t("taskDetail.dates")}</legend>
            <div className="insp-row">
              {field(t("items.start"), <input type="date" name="startDate" defaultValue={task.start_date ?? ""} />, false)}
              {field(t("board.due"), <input type="date" name="dueDate" defaultValue={task.due_date ?? ""} />, false)}
            </div>
          </fieldset>
          <fieldset disabled={!mayEdit} className="insp-section">
            <legend>{t("board.statusLabel")}</legend>
            <div className="insp-row">
              {field(t("board.statusLabel"), <select name="status" defaultValue={task.status}>{STATUSES.map((s) => <option key={s} value={s}>{t(`status.${s}`)}</option>)}</select>, false)}
              {field(t("items.priority"), <select name="priority" defaultValue={task.priority}>{PRIORITIES.map((p) => <option key={p} value={p}>{t(`priority.${p}`)}</option>)}</select>, false)}
            </div>
          </fieldset>
          {source && task.source_message_id && (
            <section className="insp-card" aria-labelledby="insp-source">
              <h3 id="insp-source">{t("taskDetail.sourceMessage")}</h3>
              <div className="insp-source">
                <span className="av" aria-hidden="true">{sender.charAt(0).toUpperCase()}</span>
                <span className="insp-source-text"><span>{source.subject}</span><span>{sender} · {when}</span></span>
                <a href={`/app/stream#msg-${task.source_message_id}`} aria-label={t("taskDetail.openMessage")}>↗</a>
              </div>
            </section>
          )}
          {ai && (
            <section className="insp-card insp-ai" aria-labelledby="insp-ai">
              <h3 id="insp-ai">{t("taskDetail.ai")}</h3>
              <p>{ai.details || ai.title}</p>
              <div className="insp-ai-row">
                <span>{t(ai.status === "pending" ? "taskDetail.aiPending" : ai.status === "accepted" ? "taskDetail.aiAccepted" : "taskDetail.aiDismissed")}</span>
                {ai.status === "pending" && <a className="act" href={`/app/notifications?project=${task.project_id}`}>{t("taskDetail.aiReview")}</a>}
              </div>
            </section>
          )}
          <a className="insp-full" href={`/app/tasks/${task.id}`}>{t("taskDetail.openFull")}</a>
        </div>
        <footer className="insp-foot">
          <a className="act" href={closeHref}>{t("board.addCancel")}</a>
          {mayEdit && <button type="submit" className="act act-primary">{t("items.save")}</button>}
        </footer>
      </form>
    </aside>
  );
}
