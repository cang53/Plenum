import type { ReactNode } from "react";
import type { ManualItem } from "@/data/live";
import { DEFAULT_COLUMNS, type Column } from "@/domain/itemsView";
import { isEarlyWarning } from "@/domain/rewards";
import type { MessageKey } from "@/lib/messages";
import { EmptyState } from "./Notice";

type T = (key: MessageKey) => string;

type Row = { item: ManualItem };

const HEAD: Record<Column, MessageKey> = { phase: "items.phase", owner: "items.owner", priority: "items.priority", due: "board.due", site: "items.site", costCode: "items.costCode" };
const ORDER: readonly Column[] = ["owner", "phase", "priority", "due", "site", "costCode"];
// Groups run from what needs attention to what is finished.
const GROUPS = ["blocked", "in_progress", "todo", "done"] as const;
export const STATUS_ICON: Record<string, string> = { todo: "○", in_progress: "◐", blocked: "⊘", done: "✓", open: "○", closed: "✓", recorded: "◇" };
export const PRIORITY_ICON: Record<string, string> = { urgent: "!!", high: "!", normal: "–", low: "↓" };

type Props = { kind: ManualItem["kind"]; rows: Row[]; t: T; rewards?: boolean; columns?: readonly Column[]; owners?: Record<string, string>; phases?: Record<string, string>; project?: string; locale?: string; selected?: string; sheetHref?: (taskId: string) => string; menu?: (item: ManualItem) => ReactNode; today?: string };

// One flat table per kind: title with a supporting line, status, then the chosen columns; the open row is outlined.
export function ItemsTable({ kind, rows, t, rewards = false, columns = DEFAULT_COLUMNS, owners = {}, phases = {}, locale = "en-GB", selected, sheetHref, menu, today = new Date().toISOString().slice(0, 10) }: Props) {
  if (!rows.length) return <EmptyState title={t("items.noItems")} body={t("items.noItemsHelp")} />;
  const short = new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
  const day = (d: string | null) => (d ? short.format(new Date(`${d}T00:00:00Z`)) : "");
  const state = (i: ManualItem) => (kind === "task" ? i.status : kind === "risk" ? i.status : "recorded");
  const stateLabel = (i: ManualItem) => (kind === "task" ? t(`status.${i.status}` as MessageKey) : kind === "risk" ? t(`risk.${i.status}` as MessageKey) : t("items.recorded"));
  const cell = (i: ManualItem, c: Column): ReactNode => {
    if (c === "owner") return i.ownerId ? owners[i.ownerId] ?? "" : "";
    if (c === "priority") return i.priority ? `${PRIORITY_ICON[i.priority] ?? ""} ${t(`priority.${i.priority}` as MessageKey)}` : "–";
    if (c === "phase") return i.phaseId ? phases[i.phaseId] ?? "" : "–";
    if (c === "due") {
      if (kind === "decision") return day((i.createdAt ?? "").slice(0, 10) || null);
      if (i.status === "done" || i.status === "closed") return i.dueDate ? `✓ ${day(i.dueDate)}` : "";
      return i.dueDate && i.dueDate < today ? <span className="due-late">⚠ {day(i.dueDate)} · {t("items.overdue")}</span> : day(i.dueDate);
    }
    return c === "site" ? i.site : i.costCode;
  };
  // Decisions have no owner, priority, site or cost code; risks have an owner and a due date.
  const cols = ORDER.filter((c) => columns.includes(c) && (kind === "task" || (kind === "risk" && (c === "owner" || c === "due")) || (kind === "decision" && c === "due")));
  const heading = (c: Column) => (c === "due" ? t(kind === "task" ? "items.col.dueDone" : kind === "risk" ? "board.due" : "items.col.updated") : t(HEAD[c]));
  const ordered = kind === "task" ? GROUPS.flatMap((g) => rows.filter((r) => r.item.status === g)) : rows;
  return (
    <div className="items-table items-flat">
      <table>
        <caption className="sr-only">{t(`items.group.${kind}` as MessageKey)}</caption>
        <thead>
          <tr>
            <th scope="col">{t("link.title")}</th>
            <th scope="col">{t("board.statusLabel")}</th>
            {cols.map((c) => <th key={c} scope="col">{heading(c)}</th>)}
            {menu && <th scope="col"><span className="sr-only">{t("items.rowOptions")}</span></th>}
          </tr>
        </thead>
        <tbody>
          {ordered.map(({ item }) => (
            <tr key={item.id} data-id={item.id} className={item.id === selected ? "sel" : undefined} aria-selected={item.id === selected}>
              <td className="ident">
                <b>{sheetHref ? <a href={sheetHref(item.id)} data-row>{item.title}</a> : item.title}</b>{kind === "risk" && item.riskKind === "issue" && ` (${t("kind.issue")})`}
                {rewards && kind === "risk" && item.riskKind !== "issue" && isEarlyWarning(item.createdAt, item.dueDate) && <> <span className="badge">{t("rewards.early")}</span></>}
                {(item.details || item.site) && <span className="meta">{(item.details || item.site).split("\n")[0]}</span>}
              </td>
              <td className={`state state-${state(item)}`}>{STATUS_ICON[state(item)]} {stateLabel(item)}</td>
              {cols.map((c) => <td key={c} className={`col-${c}`}>{cell(item, c)}</td>)}
              {menu && <td className="row-menu">{menu(item)}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
