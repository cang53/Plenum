import type { ReactNode } from "react";
import { STATUSES } from "@/domain/board";
import { MANUAL_KINDS } from "@/domain/items";
import type { MessageKey } from "@/lib/messages";
import { PopSearch } from "./PopSearch";

type T = (key: MessageKey) => string;
export type ItemsQuery = { q: string; kind: string[]; status: string[]; owner: string; phase: string };

// A query value may repeat (?kind=task&kind=risk) or be comma-joined (paging links).
export const listParam = (v: string | string[] | undefined): string[] => [v ?? []].flat().flatMap((x) => x.split(",")).filter(Boolean);
// The query as name/value pairs, one per picked value, for links and hidden fields.
export const queryPairs = (q: ItemsQuery, skip = ""): [string, string][] =>
  (Object.entries(q) as [keyof ItemsQuery, string | string[]][]).filter(([k]) => k !== skip).flatMap(([k, v]): [string, string][] => [v].flat().filter(Boolean).map((x) => [k, x]));

type Props = {
  t: T;
  action: string;
  keep: [string, string][];
  query: ItemsQuery;
  owners: Record<string, string>;
  phases: Record<string, string>;
  pending: number;
  reviewHref: string;
  create: ReactNode;
};

// Text match plus the four chips, the same for the real Items page and the demo.
export function matchesItem(i: { kind: string; title: string; details?: string; status: string; ownerId: string | null; phaseId: string | null }, q: ItemsQuery): boolean {
  const text = q.q.trim().toLowerCase();
  return (!text || `${i.title} ${i.details ?? ""}`.toLowerCase().includes(text))
    && (!q.kind.length || q.kind.includes(i.kind)) && (!q.status.length || q.status.includes(i.status))
    && (!q.owner || i.ownerId === q.owner) && (!q.phase || i.phaseId === q.phase);
}

// Page heading with the Create menu, then search and filter chips, then the pending-suggestion notice.
export function ItemsHead({ t, action, keep, query, owners, phases, pending, reviewHref, create }: Props) {
  // Each chip opens a card: checkboxes for Kind and Status, one choice for Owner and Phase (Owner with search), then Clear and Apply.
  const chip = (name: "kind" | "status" | "owner" | "phase", label: MessageKey, options: [string, string][]) => {
    const picked = [query[name]].flat().filter(Boolean);
    const many = name === "kind" || name === "status";
    const clear = `${action}?${new URLSearchParams([...keep, ...queryPairs(query, name)])}`;
    const rows = options.map(([v, l]) => (
      <label key={v} className="pop-opt" data-search={l.toLowerCase()}>
        <input type={many ? "checkbox" : "radio"} name={name} value={v} defaultChecked={picked.includes(v)} />
        <span className="pop-check" aria-hidden="true">✓</span><span>{l}</span>
      </label>
    ));
    const summary = picked.length === 0 ? t("items.filter.all") : picked.length === 1 ? options.find(([v]) => v === picked[0])?.[1] ?? picked[0] : t("items.filter.n").replace("{n}", String(picked.length));
    return (
      <details className="items-chip" name="items-chip">
        <summary aria-label={t(label)}>{`${t(label)} · ${summary}`} ⌄</summary>
        <div className="pop" role="group" aria-label={t(label)}>
          <h3>{t(label)}</h3>
          <p>{t(many ? "items.filter.helpMany" : "items.filter.helpOne")}</p>
          {name === "owner" ? <PopSearch label={t("items.search.people")}>{rows}</PopSearch> : <div className="pop-list">{rows}</div>}
          <div className="pop-actions"><a className="btn btn-secondary" href={clear}>{t("items.filter.clear")}</a><button type="submit" className="btn btn-primary">{t("items.cols.apply")}</button></div>
        </div>
      </details>
    );
  };
  return (
    <>
      <div className="items-head">
        <div>
          <h1>{t("items.heading")}</h1>
          <p>{t("items.headingHelp")}</p>
        </div>
        <details className="items-create">
          <summary className="btn btn-primary">＋ {t("items.createMenu")} ⌄</summary>
          <div className="items-create-menu">
            <h2>{t("items.createMenu")}</h2>
            <p>{t("items.createHelp")}</p>
            {create}
          </div>
        </details>
      </div>
      <form className="items-search" method="get" action={action} role="search">
        {keep.map(([k, v]) => <input key={`${k}=${v}`} type="hidden" name={k} value={v} />)}
        <input type="search" name="q" defaultValue={query.q} placeholder={t("items.search")} aria-label={t("items.search")} />
        {chip("kind", "items.chip.kind", MANUAL_KINDS.map((k) => [k, t(`kind.${k}` as MessageKey)]))}
        {chip("status", "items.chip.status", STATUSES.map((s) => [s, t(`status.${s}` as MessageKey)]))}
        {chip("owner", "items.chip.owner", Object.entries(owners))}
        {chip("phase", "items.chip.phase", Object.entries(phases))}
        </form>
      {pending > 0 && (
        <div className="items-pending" role="status">
          <p className="items-pending-title">{t("board.pending").replace("{n}", String(pending))}</p>
          <p>{t("items.pendingHelp")} <a href={reviewHref}>{t("overview.review").replace("{n}", String(pending))}</a></p>
        </div>
      )}
    </>
  );
}

const KIND_SYMBOL = { task: "✓", decision: "◇", risk: "△" } as const;

// One row of the Create menu: kind symbol, name, one line of help and a disclosure arrow; it opens the create inspector.
export function CreateOption({ kind, t, href }: { kind: keyof typeof KIND_SYMBOL; t: T; href: string }) {
  return (
    <a className="create-option" href={href}>
      <span className="create-sym" aria-hidden="true">{KIND_SYMBOL[kind]}</span>
      <span className="create-text"><b>{t(`kind.${kind}` as MessageKey)}</b><span>{t(`items.create.${kind}` as MessageKey)}</span></span>
      <span className="create-arrow" aria-hidden="true">›</span>
    </a>
  );
}

// "Tasks · 6" with the per-status counts beside it.
export function GroupHead({ title, rows, label }: { title: string; rows: { status: string }[]; label: (status: string) => string }) {
  const counts = Object.entries(rows.reduce<Record<string, number>>((m, r) => ({ ...m, [r.status]: (m[r.status] ?? 0) + 1 }), {}));
  return (
    <h2 className="items-group-head">
      <span>{title} · {rows.length}</span>
      <span className="items-group-counts">{counts.filter(([s]) => s).map(([s, n]) => `${n} ${label(s).toLowerCase()}`).join(" · ")}</span>
    </h2>
  );
}
