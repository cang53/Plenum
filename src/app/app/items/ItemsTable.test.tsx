import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { ManualItem } from "@/data/live";
import { t } from "@/lib/messages";
import { ItemsTable } from "./ItemsTable";

const item = { id: "1", kind: "task", title: "Pour slab", status: "doing", dueDate: "2026-11-01" } as ManualItem;
const T = (k: Parameters<typeof t>[0]) => t(k, "en");

describe("ItemsTable", () => {
  it("renders a labelled table with column headers, status and due date, and the edit form inside the row", () => {
    const html = renderToStaticMarkup(<ItemsTable kind="task" t={T} rows={[{ item, edit: <form>edit</form> }]} />);
    expect(html).toContain('scope="col"');
    expect(html).toContain("<caption");
    expect(html).toContain("Pour slab");
    expect(html).toContain("2026-11-01");
    expect(html).toContain("<form>edit</form>");
  });
  it("shows the plain-English empty state without a table", () => {
    const html = renderToStaticMarkup(<ItemsTable kind="task" t={T} rows={[]} />);
    expect(html).toContain(t("items.empty", "en"));
    expect(html).not.toContain("<table");
  });
});
