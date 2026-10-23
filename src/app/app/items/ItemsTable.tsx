import type { ReactNode } from "react";
import type { ManualItem } from "@/data/live";
import type { MessageKey } from "@/lib/messages";

type T = (key: MessageKey) => string;

// Dense table of one kind of item; each row's title opens its edit form.
export function ItemsTable({ kind, rows, t }: { kind: ManualItem["kind"]; rows: { item: ManualItem; edit: ReactNode }[]; t: T }) {
  if (!rows.length) return <p className="intro">{t("items.empty")}</p>;
  const status = (i: ManualItem) => (kind === "task" ? t(`status.${i.status}` as MessageKey) : kind === "risk" ? t(`risk.${i.status}` as MessageKey) : "");
  return (
    <div className="surface items-table">
      <table>
        <caption className="sr-only">{t(`items.group.${kind}` as MessageKey)}</caption>
        <thead>
          <tr>
            <th scope="col">{t("link.title")}</th>
            <th scope="col">{t("board.statusLabel")}</th>
            <th scope="col">{t("board.due")}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ item, edit }) => (
            <tr key={item.id}>
              <td><details><summary>{item.title}</summary>{edit}</details></td>
              <td>{status(item)}</td>
              <td>{kind === "task" ? item.dueDate ?? "" : ""}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
