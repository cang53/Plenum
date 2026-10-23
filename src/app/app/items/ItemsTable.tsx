import type { ReactNode } from "react";
import type { ManualItem } from "@/data/live";
import { isEarlyWarning } from "@/domain/rewards";
import type { MessageKey } from "@/lib/messages";

type T = (key: MessageKey) => string;

// Dense table of one kind of item; each row's title opens its edit form.
export function ItemsTable({ kind, rows, t, rewards = false }: { kind: ManualItem["kind"]; rows: { item: ManualItem; edit: ReactNode }[]; t: T; rewards?: boolean }) {
  if (!rows.length) return <p className="intro">{t("items.empty")}</p>;
  const status = (i: ManualItem) => (kind === "task" ? t(`status.${i.status}` as MessageKey) : kind === "risk" ? t(`risk.${i.status}` as MessageKey) : "");
  return (
    <div className="surface items-table">
      <table>
        <caption className="sr-only">{t(`items.group.${kind}` as MessageKey)}</caption>
        <thead>
          <tr>
            {kind === "task" && <th scope="col"><span className="sr-only">{t("bulk.select")}</span></th>}
            <th scope="col">{t("link.title")}</th>
            <th scope="col">{t("board.statusLabel")}</th>
            <th scope="col">{t("board.due")}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ item, edit }) => (
            <tr key={item.id}>
              {kind === "task" && <td><input type="checkbox" name="ids" value={item.id} form="bulk" aria-label={`${t("bulk.select")}: ${item.title}`} /></td>}
              <td><details><summary data-row>{item.title}{kind === "risk" && item.riskKind === "issue" ? ` (${t("kind.issue")})` : ""}</summary>{rewards && kind === "risk" && isEarlyWarning(item.createdAt, item.dueDate) && <span className="badge">{t("rewards.early")}</span>}{edit}</details></td>
              <td>{status(item)}</td>
              <td>{kind === "decision" ? "" : item.dueDate ?? ""}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
