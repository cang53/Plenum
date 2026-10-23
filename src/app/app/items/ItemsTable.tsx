import type { ReactNode } from "react";
import type { ManualItem } from "@/data/live";
import { STATUSES } from "@/domain/board";
import { DEFAULT_COLUMNS, type Column } from "@/domain/itemsView";
import { isEarlyWarning } from "@/domain/rewards";
import type { MessageKey } from "@/lib/messages";

type T = (key: MessageKey) => string;

type Row = { item: ManualItem; edit: ReactNode };

const HEAD: Record<Column, MessageKey> = { owner: "items.owner", priority: "items.priority", due: "board.due", site: "items.site", costCode: "items.costCode" };

// Dense table of one kind of item; each row's title opens its edit form. Tasks are grouped by status, each group collapsible.
export function ItemsTable({ kind, rows, t, rewards = false, columns = DEFAULT_COLUMNS, owners = {} }: { kind: ManualItem["kind"]; rows: Row[]; t: T; rewards?: boolean; columns?: readonly Column[]; owners?: Record<string, string> }) {
  if (!rows.length) return <p className="intro">{t("items.empty")}</p>;
  const status = (i: ManualItem) => (kind === "task" ? t(`status.${i.status}` as MessageKey) : kind === "risk" ? t(`risk.${i.status}` as MessageKey) : "");
  const cell = (i: ManualItem, c: Column) =>
    c === "owner" ? (i.ownerId ? owners[i.ownerId] ?? "" : "") : c === "priority" ? (i.priority ? t(`priority.${i.priority}` as MessageKey) : "") : c === "due" ? (kind === "decision" ? "" : i.dueDate ?? "") : c === "site" ? i.site : i.costCode;
  // Decisions have no owner, priority, site or cost code.
  const cols = columns.filter((c) => kind === "task" || (kind === "risk" && (c === "owner" || c === "due")) || (kind === "decision" && c === "due"));
  const table = (group: Row[], caption: string) => (
    <table>
      <caption className="sr-only">{caption}</caption>
      <thead>
        <tr>
          {kind === "task" && <th scope="col"><span className="sr-only">{t("bulk.select")}</span></th>}
          <th scope="col">{t("link.title")}</th>
          {kind === "risk" && <th scope="col">{t("board.statusLabel")}</th>}
          {cols.map((c) => <th key={c} scope="col">{t(HEAD[c])}</th>)}
        </tr>
      </thead>
      <tbody>
        {group.map(({ item, edit }) => (
          <tr key={item.id}>
            {kind === "task" && <td><input type="checkbox" name="ids" value={item.id} form="bulk" aria-label={`${t("bulk.select")}: ${item.title}`} /></td>}
            <td><details><summary data-row>{item.title}{kind === "risk" && item.riskKind === "issue" ? ` (${t("kind.issue")})` : ""}</summary>{kind === "task" && <a href={`/app/tasks/${item.id}`}>{t("taskDetail.open")}</a>}{rewards && kind === "risk" && item.riskKind !== "issue" && isEarlyWarning(item.createdAt, item.dueDate) && <span className="badge">{t("rewards.early")}</span>}{edit}</details></td>
            {kind === "risk" && <td>{status(item)}</td>}
            {cols.map((c) => <td key={c}>{cell(item, c)}</td>)}
          </tr>
        ))}
      </tbody>
    </table>
  );
  if (kind !== "task") return <div className="surface items-table">{table(rows, t(`items.group.${kind}` as MessageKey))}</div>;
  return (
    <div className="items-table">
      {STATUSES.map((s) => {
        const group = rows.filter((r) => r.item.status === s);
        if (!group.length) return null;
        return (
          <details key={s} className="items-group" open>
            <summary><span className="items-group-name">{t(`status.${s}` as MessageKey)}</span> <span className="items-count">{group.length}</span></summary>
            <div className="surface">{table(group, t(`status.${s}` as MessageKey))}</div>
          </details>
        );
      })}
    </div>
  );
}
