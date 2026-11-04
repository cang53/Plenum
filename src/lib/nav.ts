import type { MessageKey } from "./messages";

export type NavGroup = "project" | "site" | "admin";
export type NavItem = { path: string; label: MessageKey; group: NavGroup };

// Pages everyone in a project sees, then the ones their role unlocks. Row-level security still decides what each page shows.
export function navItems(role: string | undefined, isAdmin: boolean): NavItem[] {
  // Board, Items, timesheets, members and status reports are hidden from the menu, not removed; their routes still work.
  const items: NavItem[] = [
    { path: "/app", label: "app.overview", group: "project" },
    { path: "/app/stream", label: "app.stream", group: "project" },
    { path: "/app/gantt", label: "gantt.title", group: "project" },
    { path: "/app/timelines", label: "app.timeline", group: "project" },
    { path: "/app/risks", label: "app.risks", group: "project" },
    { path: "/app/library", label: "app.library", group: "project" },
    { path: "/app/charter", label: "app.charter", group: "project" },
  ];
  if (isAdmin) items.push({ path: "/app/roles", label: "app.roles", group: "project" });
  if (role === "project_manager" || isAdmin) items.push({ path: "/app/logs", label: "app.logs", group: "project" });
  items.push({ path: "/app/privacy", label: "app.privacy", group: "admin" });
  items.push({ path: "/app/settings", label: "app.settings", group: "admin" });
  return items;
}
