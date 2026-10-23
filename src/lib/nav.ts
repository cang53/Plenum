import type { MessageKey } from "./messages";

export type NavGroup = "project" | "site" | "admin";
export type NavItem = { path: string; label: MessageKey; group: NavGroup };

// Pages everyone in a project sees, then the ones their role unlocks. Row-level security still decides what each page shows.
export function navItems(role: string | undefined, isAdmin: boolean): NavItem[] {
  const items: NavItem[] = [
    { path: "/app", label: "app.overview", group: "project" },
    { path: "/app/board", label: "app.board", group: "project" },
    { path: "/app/timeline", label: "app.timeline", group: "project" },
    { path: "/app/items", label: "app.items", group: "project" },
    { path: "/app/sitelog", label: "app.sitelog", group: "site" },
    { path: "/app/timesheet", label: "app.timesheet", group: "site" },
    { path: "/app/timesheets", label: "app.timesheets", group: "site" },
    { path: "/app/members", label: "app.members", group: "admin" },
  ];
  if (role === "project_manager" || isAdmin) items.push({ path: "/app/audit", label: "app.audit", group: "admin" });
  if (role === "project_manager" || isAdmin) items.push({ path: "/app/reports", label: "app.reports", group: "admin" });
  if (isAdmin) items.push({ path: "/app/roles", label: "app.roles", group: "admin" });
  items.push({ path: "/app/privacy", label: "app.privacy", group: "admin" });
  items.push({ path: "/app/settings", label: "app.settings", group: "admin" });
  return items;
}
