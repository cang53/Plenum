import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { ManualItem } from "@/data/live";
import { t as tr } from "@/lib/messages";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: () => {} }) }));
vi.mock("@/app/app/stream/actions", () => ({ postMessage: () => {} }));
vi.mock("./actions", () => ({ deleteItem: () => {}, toggleRisk: () => {}, quickUpdate: () => {} }));
const T = (k: Parameters<typeof tr>[0]) => tr(k, "en");
const base = { id: "i1", kind: "task", title: "Pour slab", details: "Crane on site", status: "todo", priority: "high", startDate: null, dueDate: "2026-11-01", costCode: "C-12", site: "", ownerId: "u1", phaseId: null, createdAt: "2026-10-01T00:00:00Z" } as ManualItem;
const props = { projectId: "p", t: T, locale: "en-GB", shareHref: "/s", activity: [], closeHref: "/list", editHref: "/list&edit=i1" };

describe("ItemDetail", () => {
  it("shows task properties read-only, with Edit and manager actions only for managers", async () => {
    const { ItemDetail } = await import("./ItemDetail");
    const html = renderToStaticMarkup(<ItemDetail {...props} item={base} owner="Ana Kok" canManage />);
    expect(html).toContain("Task details");
    expect(html).toContain("Ana Kok");
    expect(html).toContain("C-12");
    expect(html).toContain('href="/list&amp;edit=i1"');
    expect(html).toContain("Delete item");
    const guest = renderToStaticMarkup(<ItemDetail {...props} item={base} canManage={false} />);
    expect(guest).not.toContain("Delete item");
    expect(guest).not.toContain("edit=i1");
  });
  it("offers to close an open risk and reopen a closed one", async () => {
    const { ItemDetail } = await import("./ItemDetail");
    const risk = { ...base, kind: "risk", status: "open" } as ManualItem;
    expect(renderToStaticMarkup(<ItemDetail {...props} item={risk} canManage />)).toContain("Close risk");
    expect(renderToStaticMarkup(<ItemDetail {...props} item={{ ...risk, status: "closed" }} canManage />)).toContain("Reopen risk");
  });
  it("gives the owner who cannot edit a quick update box, and managers none", async () => {
    const { ItemDetail } = await import("./ItemDetail");
    expect(renderToStaticMarkup(<ItemDetail {...props} item={base} mine canManage={false} today="2026-10-27" />)).toContain("Save my update");
    expect(renderToStaticMarkup(<ItemDetail {...props} item={base} mine canManage />)).not.toContain("Save my update");
    expect(renderToStaticMarkup(<ItemDetail {...props} item={base} canManage={false} />)).not.toContain("Save my update");
  });
});
