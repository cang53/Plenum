import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { ManualItem } from "@/data/live";
import { t as tr } from "@/lib/messages";

vi.mock("./actions", () => ({ saveItem: () => {} }));
const T = (k: Parameters<typeof tr>[0]) => tr(k, "en");
const plan = { members: [{ userId: "u1", name: "Ana Kok", email: "a@x.nl", role: "member" }], phases: [{ id: "p1", name: "Site works" }], tasks: [{ id: "t2", title: "Other" }] };
const item = { id: "t1", kind: "task", title: "Pour slab", details: "", status: "todo", priority: "normal", dueDate: null, startDate: null, costCode: "", site: "", isMilestone: false, ownerId: null, phaseId: null, parentId: null, predecessorIds: [] } as unknown as ManualItem;

describe("Fields", () => {
  it("lays the task form out as inspector: heading, labelled body, Cancel and save in the footer", async () => {
    const { Fields } = await import("./ItemFields");
    const html = renderToStaticMarkup(<Fields item={item} kind="task" projectId="p" project="Gearbox" closeHref="/back" plan={plan} t={T} />);
    expect(html).toContain("item-inspector");
    expect(html).toContain("Edit task");
    expect(html).toContain("Gearbox");
    expect(html).toContain('href="/back"');
    expect(html).toContain('name="id" value="t1"');
    expect(html).toContain("Save changes");
    expect(html).toContain("Parent");
  });
  it("names the save button after the kind when creating", async () => {
    const { Fields } = await import("./ItemFields");
    const html = renderToStaticMarkup(<Fields kind="risk" projectId="p" plan={plan} t={T} />);
    expect(html).toContain("Create risk");
    expect(html).not.toContain('name="id"');
    expect(html).toContain('checked="" value="open"');
    expect(html).not.toContain('name="priority"');
  });
});
