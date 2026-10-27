import type { ReactNode } from "react";
import type { ManualItem } from "@/data/live";
import { initials, projectPrefix, taskKey } from "@/domain/board";
import { DEFAULT_COLUMNS, type Column } from "@/domain/itemsView";
import { isEarlyWarning } from "@/domain/rewards";
import type { MessageKey } from "@/lib/messages";
import { EmptyState } from "./Notice";

type T = (key: MessageKey) => string;

type Row = { item: ManualItem };

const HEAD: Record<Column, MessageKey> = { phase: "items.phase", owner: "items.owner", priority: "items.priority", due: "board.due", site: "items.site", costCode: "items.costCode" };
// Groups run from what needs attention to what is finished; Done starts collapsed.
const GROUPS = ["blocked", "in_progress", "todo", "done"] as const;
const PRIORITY_DOT: Record<string, string> = { urgent: "st-bad", high: "st-warn", normal: "st-todo", low: "st-todo" };

type Props = { kind: ManualItem["kind"]; rows: Row[]; t: T; rewards?: boolean; columns?: readonly Column[]; owners?: Record<string, string>; phases?: Record<string, string>; project?: string; locale?: string; selected?: string; sheetHref?: (taskId: string) => string; menu?: (item: ManualItem) => ReactNode };

// Table of one kind of item. Tasks form one table with an ID column and a divider row per status; the selected row opens in the panel below.
export function ItemsTable({ kind, rows, t, rewards = false, columns = DEFAULT_COLUMNS, owners = {}, phases = {}, project = "", locale = "en-GB", selected, sheetHref, menu }: Props) {
  if (!rows.length) return <EmptyState title={t("items.noItems")} body={t("items.noItemsHelp")} />;
  const prefix = projectPrefix(project);
  const short = new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", timeZone: "UTC" });
  const day = (d: string | null) => (d ? short.format(new Date(`${d}T00:00:00Z`)) : "");
  const status = (i: ManualItem) => (kind === "risk" ? t(`risk.${i.status}` as MessageKey) : "");
  const cell = (i: ManualItem, c: Column): ReactNode => {
    if (c === "owner") return i.ownerId && owners[i.ownerId] ? <span className="av" title={owners[i.ownerId]}>{initials(owners[i.ownerId]!)}<span className="sr-only">{owners[i.ownerId]}</span></span> : "";
    if (c === "priority") return i.priority ? <span className={`st ${PRIORITY_DOT[i.priority] ?? "st-todo"}`}>{t(`priority.${i.priority}` as MessageKey)}</span> : "";
    if (c === "phase") return i.phaseId ? phases[i.phaseId] ?? "" : "";
    if (c === "due") return kind === "decision" ? "" : day(i.dueDate);
    return c === "site" ? i.site : i.costCode;
  };
  // Decisions have no owner, priority, site or cost code; risks have an owner and a due date.
  const cols = columns.filter((c) => kind === "task" || (kind === "risk" && (c === "owner" || c === "due")) || (kind === "decision" && c === "due"));
  const align = (c: Column) => (c === "due" ? "r" : undefined);
  if (kind === "task") {
    return (
      <div className="items-table">
        <table>
          <caption className="sr-only">{t("items.group.task")}</caption>
          <thead>
            <tr>
              <th scope="col"><span className="sr-only">{t("bulk.select")}</span></th>
              <th scope="col">{t("items.col.id")}</th>
              <th scope="col">{t("link.title")}</th>
              {cols.map((c) => <th key={c} scope="col" className={align(c)}>{t(HEAD[c])}</th>)}
              {menu && <th scope="col"><span className="sr-only">{t("items.rowOptions")}</span></th>}
            </tr>
          </thead>
          {GROUPS.map((s) => {
            const group = rows.filter((r) => r.item.status === s);
            if (!group.length) return null;
            return (
              <tbody key={s} className="items-group">
                <tr className="grp">
                  <td colSpan={3 + cols.length + (menu ? 1 : 0)}>
                    <label><input type="checkbox" className="grp-toggle" defaultChecked={s === "done"} aria-label={t(`status.${s}` as MessageKey)} /><span className="items-group-name">{t(`status.${s}` as MessageKey)}</span> <span className="items-count">{group.length}</span></label>
                  </td>
                </tr>
                {group.map(({ item }) => (
                  <tr key={item.id} className={item.id === selected ? "sel" : undefined} aria-selected={item.id === selected}>
                    <td><input type="checkbox" name="ids" value={item.id} form="bulk" aria-label={`${t("bulk.select")}: ${item.title}`} /></td>
                    <td className="id">{item.number ? taskKey(prefix, item.number) : ""}</td>
                    <td><b>{sheetHref ? <a href={sheetHref(item.id)} data-row>{item.title}</a> : item.title}</b></td>
                    {cols.map((c) => <td key={c} className={align(c)}>{cell(item, c)}</td>)}
                    {menu && <td className="row-menu">{menu(item)}</td>}
                  </tr>
                ))}
              </tbody>
            );
          })}
        </table>
      </div>
    );
  }
  return (
    <div className="surface items-table">
      <table>
        <caption className="sr-only">{t(`items.group.${kind}` as MessageKey)}</caption>
        <thead>
          <tr>
            <th scope="col">{t("link.title")}</th>
            {kind === "risk" && <th scope="col">{t("board.statusLabel")}</th>}
            {cols.map((c) => <th key={c} scope="col" className={align(c)}>{t(HEAD[c])}</th>)}
            {menu && <th scope="col"><span className="sr-only">{t("items.rowOptions")}</span></th>}
          </tr>
        </thead>
        <tbody>
          {rows.map(({ item }) => (
            <tr key={item.id} className={item.id === selected ? "sel" : undefined} aria-selected={item.id === selected}>
              <td><b>{sheetHref ? <a href={sheetHref(item.id)} data-row>{item.title}</a> : item.title}</b>{kind === "risk" && item.riskKind === "issue" ? ` (${t("kind.issue")})` : ""}{rewards && kind === "risk" && item.riskKind !== "issue" && isEarlyWarning(item.createdAt, item.dueDate) && <> <span className="badge">{t("rewards.early")}</span></>}</td>
              {kind === "risk" && <td>{status(item)}</td>}
              {cols.map((c) => <td key={c} className={align(c)}>{cell(item, c)}</td>)}
              {menu && <td className="row-menu">{menu(item)}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
