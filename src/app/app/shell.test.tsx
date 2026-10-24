import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { Shell } from "./shell";

vi.mock("next/navigation", () => ({ usePathname: () => "/app/stream", useSearchParams: () => new URLSearchParams(), useRouter: () => ({ push: () => {} }) }));

const menu = { open: "Search or jump to…", title: "t", placeholder: "p", actions: "a", results: "r", empty: "e", newTask: "New task", search: "s", task: "Task", message: "Message", decision: "Decision" };
const labels = {
  brand: "Plenum", main: "Main", projects: "Projects", account: "Account", signOut: "Sign out", mobile: "Mobile", bell: "Inbox", newTask: "New task", mywork: "My work", streamNew: "{n} new in stream",
  views: { title: "Views", at_risk: "At risk", blocked: "Blocked", week: "Due this week" }, menu, group: { project: "Project", site: "Site", admin: "Admin" },
};
const items = [{ path: "/app/stream", label: "Stream", group: "project" as const }];
const render = (projects: { id: string; name: string }[], streamNew: Record<string, number>) =>
  renderToStaticMarkup(<Shell projects={projects} itemsByProject={{}} fallbackItems={items} email="a@b.c" unread={0} unreadLabel="{n}" streamNew={streamNew} labels={labels}>x</Shell>);

describe("Shell", () => {
  it("has My work, Views, a stream badge and a search field for the command menu", () => {
    const html = render([{ id: "p1", name: "Pump" }], { p1: 3 });
    expect(html).toContain("quick=mine");
    for (const q of ["at_risk", "blocked", "week"]) expect(html).toContain(`quick=${q}`);
    expect(html).toContain("3 new in stream");
    expect(html).toContain("Search or jump to…");
    expect(html).not.toContain("<details");
  });
  it("shows a switcher only with several projects, and no badge without new messages", () => {
    const html = render([{ id: "p1", name: "A" }, { id: "p2", name: "B" }], {});
    expect(html).toContain("<details");
    expect(html).not.toContain("new in stream");
  });
});
