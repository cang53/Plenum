import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { ManualItem } from "@/data/live";
import { t } from "@/lib/messages";
import { ItemsTable } from "./ItemsTable";

const item = { id: "1", kind: "task", title: "Pour slab", status: "in_progress", dueDate: "2026-11-01" } as ManualItem;
const T = (k: Parameters<typeof t>[0]) => t(k, "en");

describe("ItemsTable", () => {
  it("renders one labelled task table with column headers, and the task's link", () => {
    const html = renderToStaticMarkup(<ItemsTable kind="task" t={T} project="Pump skid P-204" sheetHref={(id) => `/app/items?task=${id}`} rows={[{ item: { ...item, number: 14 } }]} />);
    expect(html).toContain('scope="col"');
    expect(html).toContain("<caption");
    expect(html).toContain('href="/app/items?task=1"');
    expect(html).toContain("1 Nov");
  });
  it("marks the selected row", () => {
    const html = renderToStaticMarkup(<ItemsTable kind="task" t={T} selected="1" rows={[{ item }]} />);
    expect(html).toContain('class="sel"');
  });
  it("shows the plain-English empty state without a table", () => {
    const html = renderToStaticMarkup(<ItemsTable kind="task" t={T} rows={[]} />);
    expect(html).toContain(t("items.noItems", "en"));
    expect(html).not.toContain("<table");
  });
  it("lists tasks flat, blocked first then in progress, to do and done, with a supporting line and icon status", () => {
    const rows = [item, { ...item, id: "3", title: "Order glass", status: "blocked", details: "Awaiting sign-off\nmore" }, { ...item, id: "4", title: "Old", status: "done" }].map((i) => ({ item: i }));
    const html = renderToStaticMarkup(<ItemsTable kind="task" t={T} rows={rows} today="2026-10-27" />);
    expect(html.indexOf("Order glass")).toBeLessThan(html.indexOf("Pour slab"));
    expect(html.indexOf("Pour slab")).toBeLessThan(html.indexOf("Old"));
    expect(html).toContain('<span class="meta">Awaiting sign-off</span>');
    expect(html).toContain("⊘ Blocked");
    expect(html).not.toContain("items-group");
  });
  it("flags an open task past its due date as overdue", () => {
    const late = { ...item, dueDate: "2026-10-23" } as ManualItem;
    expect(renderToStaticMarkup(<ItemsTable kind="task" t={T} rows={[{ item: late }]} today="2026-10-27" />)).toContain("overdue");
    expect(renderToStaticMarkup(<ItemsTable kind="task" t={T} rows={[{ item: { ...late, status: "done" } }]} today="2026-10-27" />)).not.toContain("overdue");
  });
  it("shows the chosen columns: owner name, priority icon and word, phase name", () => {
    const owned = { ...item, ownerId: "u1", site: "North", priority: "high", phaseId: "p1" } as ManualItem;
    const html = renderToStaticMarkup(<ItemsTable kind="task" t={T} columns={["owner", "priority", "phase", "site"]} owners={{ u1: "Ana Kok" }} phases={{ p1: "Site works" }} rows={[{ item: owned }]} />);
    expect(html).toContain("Ana Kok");
    expect(html).toContain("! High");
    expect(html).toContain("High");
    expect(html).toContain("Site works");
    expect(html).toContain("North");
    expect(html).not.toContain("1 Nov");
  });
  it("links decision and risk rows to their detail view and marks the open one", () => {
    const html = renderToStaticMarkup(<ItemsTable kind="decision" t={T} selected="1" sheetHref={(id) => `/x?detail=${id}`} rows={[{ item: { ...item, kind: "decision" } }]} />);
    expect(html).toContain('href="/x?detail=1"');
    expect(html).toContain('class="sel"');
  });
});
