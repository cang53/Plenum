import type { MessageKey } from "./messages";

// rail: icon tiles; top: tile in the top bar; more: links in the account menu until Settings gets its sub-nav.
export type NavGroup = "rail" | "top" | "more";
export type NavItem = { path: string; label: MessageKey; group: NavGroup };

// Pages everyone in a project sees, then the ones their role unlocks. Row-level security still decides what each page shows.
export function navItems(role: string | undefined, isAdmin: boolean): NavItem[] {
  const items: NavItem[] = [
    { path: "/app", label: "app.overview", group: "rail" },
    { path: "/app/stream", label: "app.stream", group: "rail" },
    { path: "/app/gantt", label: "app.plan", group: "rail" },
    { path: "/app/board", label: "app.board", group: "rail" },
    { path: "/app/items", label: "app.items", group: "rail" },
    { path: "/app/risks", label: "app.risks", group: "rail" },
    { path: "/app/library", label: "app.library", group: "rail" },
    { path: "/app/reports", label: "app.reports", group: "rail" },
    { path: "/app/members", label: "app.team", group: "rail" },
    { path: "/app/settings", label: "app.settings", group: "top" },
    { path: "/app/timelines", label: "app.timeline", group: "more" },
    { path: "/app/charter", label: "app.charter", group: "more" },
  ];
  if (isAdmin) items.push({ path: "/app/roles", label: "app.roles", group: "more" });
  if (role === "project_manager" || isAdmin) items.push({ path: "/app/logs", label: "app.logs", group: "more" });
  items.push({ path: "/app/privacy", label: "app.privacy", group: "more" });
  return items;
}
