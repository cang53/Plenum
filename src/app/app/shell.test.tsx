import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { Shell } from "./shell";

vi.mock("next/navigation", () => ({ usePathname: () => "/app/stream", useSearchParams: () => new URLSearchParams(), useRouter: () => ({ push: () => {} }) }));

const menu = { open: "Search or jump to…", title: "t", placeholder: "p", actions: "a", results: "r", empty: "e", newTask: "New task", search: "s", task: "Task", message: "Message", decision: "Decision" };
const labels = {
  brand: "Plenum", main: "Main", projects: "Projects", account: "Account", signOut: "Sign out", bell: "Inbox", theme: "Light theme", newTask: "New task", streamNew: "{n} new in stream",
  privacy: { body: "Only project mail is read.", link: "How it works" }, menu,
};

const items = [
  { path: "/app", label: "Overview", group: "rail" as const },
  { path: "/app/stream", label: "Stream", group: "rail" as const },
  { path: "/app/members", label: "Team", group: "rail" as const },
  { path: "/app/settings", label: "Settings", group: "top" as const },
  { path: "/app/charter", label: "Charter", group: "more" as const },
];
const render = (projects: { id: string; name: string }[], streamNew: Record<string, number>) =>
  renderToStaticMarkup(<Shell projects={projects} itemsByProject={{}} fallbackItems={items} email="a@b.c" roleByProject={{ p1: "Project manager" }} unread={0} unreadLabel="{n}" streamNew={streamNew} labels={labels}>x</Shell>);

describe("Shell", () => {
  it("has an icon rail with a stream dot, a search field for the command menu and a settings tile", () => {
    const html = render([{ id: "p1", name: "Pump" }], { p1: 3 });
    expect(html).toContain("3 new in stream");
    expect(html).toContain("Search or jump to…");
    expect(html).toContain('aria-label="Settings"');
    expect(html).toContain('class="shell-rail"');
    expect(html).not.toContain("shell-projects");
  });
  it("shows a switcher only with several projects, and no dot without new messages", () => {
    const html = render([{ id: "p1", name: "A" }, { id: "p2", name: "B" }], {});
    expect(html).toContain("<details");
    expect(html).not.toContain("new in stream");
  });
  it("shows the role, the trust line and the other pages in the account menu", () => {
    const html = render([{ id: "p1", name: "Pump" }], {});
    expect(html).toContain("Project manager");
    expect(html).toContain("Only project mail is read.");
    expect(html).toMatch(/<details class="shell-account".*Charter.*Sign out/);
  });
});
