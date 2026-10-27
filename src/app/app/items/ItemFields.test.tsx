import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { ManualItem } from "@/data/live";
import { t as tr } from "@/lib/messages";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: () => {} }) }));
vi.mock("./actions", () => ({ saveItem: () => {} }));
const T = (k: Parameters<typeof tr>[0]) => tr(k, "en");
const plan = { members: [{ userId: "u1", name: "Ana Kok", email: "a@x.nl", role: "member" }], phases: [{ id: "p1", name: "Site works" }], tasks: [{ id: "t2", title: "Other" }] };
const item = { id: "t1", kind: "task", title: "Pour slab", details: "", status: "todo", priority: "normal", dueDate: null, startDate: null, costCode: "", site: "", isMilestone: false, ownerId: null, phaseId: null, parentId: null, predecessorIds: [] } as unknown as ManualItem;

describe("Fields edit", () => {
  it("hides the kind, shows the source message and the pending suggestion link", async () => {
    const { Fields } = await import("./ItemFields");
    const source = { subject: "Re: Gearbox", from: "Marta", receivedAt: "2026-10-20T08:00:00Z", href: "/s", review: { title: "Move install", href: "/r" } };
    const html = renderToStaticMarkup(<Fields item={item} kind="task" projectId="p" plan={plan} source={source} t={T} />);
    expect(html).not.toContain("insp-kind");
    expect(html).toContain('href="/s"');
    expect(html).toContain("Re: Gearbox");
    expect(html).toContain('href="/r"');
    expect(renderToStaticMarkup(<Fields item={item} kind="task" projectId="p" plan={plan} t={T} />)).not.toContain("insp-card");
  });
});

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

describe("Fields from a message", () => {
  it("shows the message after the kind, prefills the title and keeps the link", async () => {
    const { Fields } = await import("./ItemFields");
    const html = renderToStaticMarkup(<Fields kind="decision" projectId="p" plan={plan} source={{ id: "m1", subject: "Install moves", from: "Marta", receivedAt: "2026-10-20T08:00:00Z", href: "/s" }} t={T} />);
    expect(html).toContain('name="sourceMessageId" value="m1"');
    expect(html).toContain('value="Install moves"');
    expect(html.indexOf("insp-kind")).toBeLessThan(html.indexOf("insp-card"));
    expect(html.indexOf("insp-card")).toBeLessThan(html.indexOf('name="title"'));
  });
});
