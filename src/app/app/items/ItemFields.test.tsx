import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { ManualItem } from "@/data/live";
import { t as tr } from "@/lib/messages";

vi.mock("./actions", () => ({ saveItem: () => {} }));
const T = (k: Parameters<typeof tr>[0]) => tr(k, "en");
const plan = { members: [{ userId: "u1", name: "Ana Kok", email: "a@x.nl" }], phases: [{ id: "p1", name: "Site works" }], tasks: [{ id: "t2", title: "Other" }] };
const item = { id: "t1", kind: "task", title: "Pour slab", details: "", status: "todo", priority: "normal", dueDate: null, startDate: null, costCode: "", site: "", isMilestone: false, ownerId: null, phaseId: null, parentId: null, predecessorIds: [] } as unknown as ManualItem;

describe("Fields", () => {
  it("lays the task form out as a grid with full-width title, details and actions", async () => {
    const { Fields } = await import("./ItemFields");
    const html = renderToStaticMarkup(<Fields item={item} kind="task" projectId="p" plan={plan} t={T} />);
    expect(html).toContain('class="item-form"');
    expect(html.match(/class="wide"/g)!.length).toBeGreaterThanOrEqual(3);
    expect(html).toContain('class="wide actions"');
    expect(html).toContain("Save changes");
  });
});
