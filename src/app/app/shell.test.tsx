import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { Shell } from "./shell";

vi.mock("next/navigation", () => ({ usePathname: () => "/app/stream", useSearchParams: () => new URLSearchParams(), useRouter: () => ({ push: () => {} }) }));

const menu = { open: "Search or jump to…", title: "t", placeholder: "p", actions: "a", results: "r", empty: "e", newTask: "New task", search: "s", task: "Task", message: "Message", decision: "Decision" };
const labels = {
  brand: "Plenum", main: "Main", projects: "Projects", account: "Account", signOut: "Sign out", bell: "Inbox", theme: "Light theme", newTask: "New task", streamNew: "{n} new in stream", railExpand: "Show menu", railCollapse: "Hide menu",
  privacy: { body: "Only project mail is read.", link: "How it works" }, menu,
};

const items = [
  { path: "/app", label: "Overview", group: "rail" as const },
  { path: "/app/stream", label: "Stream", group: "rail" as const },
  { path: "/app/members", label: "Team", group: "rail" as const },
  { path: "/app/settings", label: "Settings", group: "top" as const },
  { path: "/app/charter", label: "Charter", group: "more" as const },
];
const rooms = { p1: [
  { id: "r1", name: "General", emoji: "", general: true, threads: [{ id: "t1", title: "Gearbox delay" }] },
  { id: "r2", name: "Site", emoji: "🏗️", general: false, threads: [] },
] };
const render = (projects: { id: string; name: string }[], streamNew: Record<string, number>, extra: { rooms?: typeof rooms; workspace?: string } = {}) =>
  renderToStaticMarkup(<Shell projects={projects} itemsByProject={{}} fallbackItems={items} email="a@b.c" roleByProject={{ p1: "Project manager" }} unread={0} unreadLabel="{n}" streamNew={streamNew} labels={labels} {...extra}>x</Shell>);

describe("Shell", () => {
  it("has a sidebar with search, Home and Projects, and the project's pages as tabs", () => {
    const html = render([{ id: "p1", name: "Pump" }], { p1: 3 });
    expect(html).toContain('class="shell-side"');
    expect(html).toContain("Search or jump to…");
    expect(html).toMatch(/class="shell-tabs".*Stream.*Team/);
    expect(html).not.toMatch(/class="shell-tabs"[^>]*>(?:(?!<\/nav>).)*Overview/);
    expect(html).toContain("Settings");
  });
  it("lists each project's chatrooms with their threads, and marks the current one", () => {
    const html = render([{ id: "p1", name: "Pump" }], { p1: 3 }, { rooms });
    expect(html).toContain("Gearbox delay");
    expect(html).toContain("🏗️");
    expect(html).toContain("/app/stream?project=p1&amp;room=r1&amp;thread=t1");
    expect(html).toMatch(/aria-current="page" href="\/app\/stream\?project=p1&amp;room=r1"|href="\/app\/stream\?project=p1&amp;room=r1" aria-current="page"/);
    expect(html).toContain("3 new in stream");
  });
  it("falls back to a single stream link while chatrooms are not available", () => {
    const html = render([{ id: "p1", name: "Pump" }], {});
    expect(html).toContain('href="/app/stream?project=p1"');
  });
  it("shows a breadcrumb with the workspace and project, and a toggle that starts open", () => {
    const html = render([{ id: "p1", name: "Pump" }], {}, { workspace: "Acme" });
    expect(html).toMatch(/<ol><li>Acme<\/li><li>Pump<\/li><li aria-current="page">Stream<\/li><\/ol>/);
    expect(html).toContain('data-side="open"');
    expect(html).toContain('aria-expanded="true"');
    expect(html).toContain('aria-label="Hide menu"');
  });
  it("shows the role, the trust line and the other pages in the account menu", () => {
    const html = render([{ id: "p1", name: "Pump" }], {});
    expect(html).toContain("Project manager");
    expect(html).toContain("Only project mail is read.");
    expect(html).toMatch(/<details class="shell-account".*Charter.*Sign out/);
  });
});

describe("Shell sidebar from the design", () => {
  it("shows the workspace name, Search, Home, Library, My Chatroom and a blue New task button", () => {
    const html = renderToStaticMarkup(<Shell projects={[{ id: "p1", name: "Pump" }]} rooms={rooms} workspace="Acme" itemsByProject={{}} fallbackItems={items} email="a@b.c" roleByProject={{}} unread={0} unreadLabel="{n}" streamNew={{}} labels={{ ...labels, search: "Search", myChatroom: "My Chatroom", addChatroom: "Add chatrooms", chatroomName: "Name" }}>x</Shell>);
    expect(html).toContain('<span class="side-name">Acme</span>');
    expect(html).toContain("My Chatroom");
    expect(html).toContain("Add chatrooms");
    expect(html).toMatch(/class="side-cta"[^>]*>New task/);
  });
});

describe("Shell header from the design", () => {
  it("shows the chatroom title and a search box on the stream page, with the room in the breadcrumb", () => {
    const html = renderToStaticMarkup(<Shell projects={[{ id: "p1", name: "Pump" }]} rooms={rooms} workspace="Acme" itemsByProject={{}} fallbackItems={items} email="a@b.c" roleByProject={{}} unread={0} unreadLabel="{n}" streamNew={{}} labels={{ ...labels, back: "Back", forward: "Forward", searchIn: "Search in {n}" }}>x</Shell>);
    expect(html).toContain("<h1>General</h1>");
    expect(html).toContain('placeholder="Search in General"');
    expect(html).toContain('action="/app/search"');
    expect(html).toContain('aria-label="Back"');
    expect(html).toMatch(/<li aria-current="page">General<\/li>/);
  });
  it("links the pin icon to the room's pinned decisions", () => {
    const html = renderToStaticMarkup(<Shell projects={[{ id: "p1", name: "Pump" }]} rooms={rooms} workspace="Acme" itemsByProject={{}} fallbackItems={items} email="a@b.c" roleByProject={{}} unread={0} unreadLabel="{n}" streamNew={{}} labels={{ ...labels, pinned: "Pinned decisions" }}>x</Shell>);
    expect(html).toMatch(/class="head-pin" href="\/app\/stream\?project=p1&amp;room=[^&]+&amp;view=decisions" aria-label="Pinned decisions"/);
  });
});
