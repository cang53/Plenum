import { type ManualItem } from "@/data/live";
import { type Member } from "@/data/projects";
import { PRIORITIES, RISK_KINDS, RISK_STATUSES } from "@/domain/items";
import { STATUSES } from "@/domain/board";
import type { MessageKey } from "@/lib/messages";
import { saveItem } from "./actions";

export type Plan = { members: Member[]; phases: { id: string; name: string }[]; tasks: { id: string; title: string }[] };

export function Fields({ item, kind, projectId, plan, t }: { item?: ManualItem; kind: ManualItem["kind"]; projectId: string; plan: Plan; t: (key: MessageKey) => string }) {
  return (
    <form action={saveItem} className="item-form">
      <input type="hidden" name="kind" value={kind} />
      <input type="hidden" name="projectId" value={projectId} />
      {item && <input type="hidden" name="id" value={item.id} />}
      <label className="wide">{t("link.title")} <input name="title" required defaultValue={item?.title} /></label>
      <label className="wide">{t("link.details")} <textarea name="details" maxLength={5000} defaultValue={item?.details} /></label>
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
          <label>{t("items.start")} <input type="date" name="startDate" defaultValue={item?.startDate ?? ""} /></label>
          <label>{t("board.due")} <input type="date" name="dueDate" defaultValue={item?.dueDate ?? ""} /></label>
          <label className="check wide"><input type="checkbox" name="isMilestone" defaultChecked={item?.isMilestone ?? false} /> {t("items.milestone")}</label>
          <label>{t("items.costCode")} <input name="costCode" maxLength={40} defaultValue={item?.costCode ?? ""} /></label>
          <label>{t("items.site")} <input name="site" maxLength={80} defaultValue={item?.site ?? ""} /></label>
          <label>{t("items.owner")}{" "}
            <select name="ownerId" defaultValue={item?.ownerId ?? ""}>
              <option value="">{t("items.none")}</option>
              {plan.members.map((m) => <option key={m.userId} value={m.userId}>{m.name || m.email}</option>)}
            </select>
          </label>
          <label>{t("items.phase")}{" "}
            <select name="phaseId" defaultValue={item?.phaseId ?? ""}>
              <option value="">{t("items.none")}</option>
              {plan.phases.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </label>
          <label>{t("items.parent")}{" "}
            <select name="parentId" defaultValue={item?.parentId ?? ""}>
              <option value="">{t("items.none")}</option>
              {plan.tasks.filter((o) => o.id !== item?.id).map((o) => <option key={o.id} value={o.id}>{o.title}</option>)}
            </select>
          </label>
          <label className="wide">{t("items.predecessors")}{" "}
            <select name="predecessorIds" multiple defaultValue={item?.predecessorIds ?? []}>
              {plan.tasks.filter((o) => o.id !== item?.id).map((o) => <option key={o.id} value={o.id}>{o.title}</option>)}
            </select>
          </label>
        </>
      )}
      {kind === "risk" && (
        <>
          <label>{t("risk.kindLabel")}{" "}
            <select name="riskKind" defaultValue={item?.riskKind || "risk"}>
              {RISK_KINDS.map((k) => <option key={k} value={k}>{t(`kind.${k}` as MessageKey)}</option>)}
            </select>
          </label>
          <label>{t("board.statusLabel")}{" "}
            <select name="status" defaultValue={item?.status ?? "open"}>
              {RISK_STATUSES.map((s) => <option key={s} value={s}>{t(`risk.${s}`)}</option>)}
            </select>
          </label>
          <label>{t("board.due")} <input type="date" name="dueDate" defaultValue={item?.dueDate ?? ""} /></label>
          <label>{t("items.owner")}{" "}
            <select name="ownerId" defaultValue={item?.ownerId ?? ""}>
              <option value="">{t("items.none")}</option>
              {plan.members.map((m) => <option key={m.userId} value={m.userId}>{m.name || m.email}</option>)}
            </select>
          </label>
        </>
      )}
      <div className="wide actions"><button type="submit" className="btn btn-primary">{t(item ? "items.save" : "items.create")}</button></div>
    </form>
  );
}
