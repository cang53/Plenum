import type { MessageKey } from "./messages";

export type NavItem = { path: string; label: MessageKey };

// Pages everyone in a project sees, then the ones their role unlocks. Row-level security still decides what each page shows.
export function navItems(role: string | undefined, isAdmin: boolean): NavItem[] {
  const items: NavItem[] = [
    { path: "/app", label: "app.overview" },
    { path: "/app/board", label: "app.board" },
    { path: "/app/timeline", label: "app.timeline" },
    { path: "/app/items", label: "app.items" },
    { path: "/app/notifications", label: "app.notifications" },
    { path: "/app/members", label: "app.members" },
  ];
  if (role === "project_manager" || isAdmin) items.push({ path: "/app/audit", label: "app.audit" });
  if (isAdmin) items.push({ path: "/app/roles", label: "app.roles" });
  items.push({ path: "/app/settings", label: "app.settings" });
  return items;
}
