import type { ReactNode } from "react";
import { STATUSES } from "@/domain/board";
import { MANUAL_KINDS } from "@/domain/items";
import type { MessageKey } from "@/lib/messages";

type T = (key: MessageKey) => string;
export type ItemsQuery = { q: string; kind: string; status: string; owner: string; phase: string };

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
    && (!q.kind || i.kind === q.kind) && (!q.status || i.status === q.status)
    && (!q.owner || i.ownerId === q.owner) && (!q.phase || i.phaseId === q.phase);
}

// Page heading with the Create menu, then search and filter chips, then the pending-suggestion notice.
export function ItemsHead({ t, action, keep, query, owners, phases, pending, reviewHref, create }: Props) {
  const chip = (name: keyof ItemsQuery, label: MessageKey, options: [string, string][]) => (
    <label className="items-chip">
      <span className="sr-only">{t(label)}</span>
      <select name={name} defaultValue={query[name]} aria-label={t(label)}>
        <option value="">{`${t(label)} · ${t("items.filter.all")}`}</option>
        {options.map(([v, l]) => <option key={v} value={v}>{`${t(label)} · ${l}`}</option>)}
      </select>
    </label>
  );
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
        <button type="submit" className="btn btn-secondary">{t("items.cols.apply")}</button>
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
