import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { ManualItem } from "@/data/live";
import { t } from "@/lib/messages";
import { ItemsTable } from "./ItemsTable";

const item = { id: "1", kind: "task", title: "Pour slab", status: "in_progress", dueDate: "2026-11-01" } as ManualItem;
const T = (k: Parameters<typeof t>[0]) => t(k, "en");

describe("ItemsTable", () => {
  it("renders one labelled task table with an ID column, column headers, and the task's link", () => {
    const html = renderToStaticMarkup(<ItemsTable kind="task" t={T} project="Pump skid P-204" sheetHref={(id) => `/app/items?task=${id}`} rows={[{ item: { ...item, number: 14 } }]} />);
    expect(html).toContain('scope="col"');
    expect(html).toContain("<caption");
    expect(html).toContain("P-204-14");
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
  it("groups tasks under divider rows with counts, blocked first, Done collapsed, skipping empty groups", () => {
    const rows = [item, { ...item, id: "2", title: "Frame wall" }, { ...item, id: "3", title: "Order glass", status: "blocked" }, { ...item, id: "4", title: "Old", status: "done" }].map((i) => ({ item: i }));
    const html = renderToStaticMarkup(<ItemsTable kind="task" t={T} rows={rows} />);
    expect(html.match(/<tbody class="items-group"/g)).toHaveLength(3);
    expect(html.indexOf("Order glass")).toBeLessThan(html.indexOf("Pour slab"));
    expect(html).toContain('<span class="items-count">2</span>');
    expect(html.match(/checked=""/g)).toHaveLength(1);
    expect(html).not.toContain(">To do<");
  });
  it("shows the chosen columns: owner initials, priority dot and word, phase name", () => {
    const owned = { ...item, ownerId: "u1", site: "North", priority: "high", phaseId: "p1" } as ManualItem;
    const html = renderToStaticMarkup(<ItemsTable kind="task" t={T} columns={["owner", "priority", "phase", "site"]} owners={{ u1: "Ana Kok" }} phases={{ p1: "Site works" }} rows={[{ item: owned }]} />);
    expect(html).toContain(">AK<");
    expect(html).toContain("st-warn");
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
