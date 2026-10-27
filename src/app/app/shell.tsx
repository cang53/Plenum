"use client";

import { usePathname, useSearchParams } from "next/navigation";
import type { ReactNode } from "react";
import { Bell } from "./Bell";
import { CommandMenu } from "./CommandMenu";

type Group = "project" | "site" | "admin";
type Item = { path: string; label: string; group: Group };
type Props = {
  projects: { id: string; name: string }[];
  itemsByProject: Record<string, Item[]>;
  fallbackItems: Item[];
  email: string;
  unread: number;
  streamNew: Record<string, number>;
  labels: Record<"brand" | "main" | "projects" | "account" | "signOut" | "mobile" | "bell" | "newTask" | "mywork" | "streamNew", string> & { views: Record<"title" | "at_risk" | "blocked" | "week", string>; menu: React.ComponentProps<typeof CommandMenu>["labels"]; group: Record<Group, string> };
  // A template with {n}: functions cannot be passed from the server layout to this client component.
  unreadLabel: string;
  children: ReactNode;
};

const GROUPS: Group[] = ["project", "site", "admin"];

export function Shell({ projects, itemsByProject, fallbackItems, email, unread, streamNew, unreadLabel, labels, children }: Props) {
  const pathname = usePathname();
  const chosen = useSearchParams().get("project");
  const project = projects.find((p) => p.id === chosen) ?? projects[0];
  const items = (project && itemsByProject[project.id]) || fallbackItems;
  const href = (path: string) => (project ? `${path}?project=${project.id}` : path);
  const current = (path: string) => (path === "/app" ? pathname === path : pathname.startsWith(path));
  const fresh = project ? (streamNew[project.id] ?? 0) : 0;
  const link = (i: Item) => {
    const badge = i.path === "/app/stream" && fresh > 0;
    return (
      <a key={i.path} href={href(i.path)} className={`shell-link${badge ? " shell-unread" : ""}`} aria-current={current(i.path) ? "page" : undefined} aria-label={badge ? `${i.label}: ${labels.streamNew.replace("{n}", String(fresh))}` : undefined}>
        <span aria-hidden={badge || undefined}>{i.label}</span>
        {badge && <span className="shell-badge" aria-hidden="true">{fresh > 99 ? "99+" : fresh}</span>}
      </a>
    );
  };
  const quick = (q: string) => `/app/items?${project ? `project=${project.id}&` : ""}quick=${q}`;
  const quickLink = (q: string, label: string) => (
    <a key={q} href={quick(q)} className="shell-link" aria-current={pathname === "/app/items" && quickNow === q ? "page" : undefined}>{label}</a>
  );
  const quickNow = useSearchParams().get("quick");
  const inbox = (
    <Bell href={href("/app/notifications")} initial={unread} label={labels.bell} current={pathname.startsWith("/app/notifications")} countLabel={(n) => unreadLabel.replace("{n}", String(n))} />
  );
  return (
    <div className="shell">
      <header className="shell-top">
        <a className="shell-brand" href={href("/app")}><span className="shell-logo" aria-hidden="true">p</span>{labels.brand}</a>
        {projects.length > 1 && (
          <details className="shell-projects">
            <summary><span className="shell-crumb">{labels.projects} /</span> {project?.name}</summary>
            <ul aria-label={labels.projects}>
              {projects.map((p) => (
                <li key={p.id}><a href={`${pathname}?project=${p.id}`} aria-current={p.id === project?.id ? "true" : undefined}>{p.name}</a></li>
              ))}
            </ul>
          </details>
        )}
        {projects.length === 1 && <p className="shell-project"><span className="shell-crumb">{labels.projects} /</span> {project?.name}</p>}
        <CommandMenu project={project?.id} labels={labels.menu} />
        <a className="btn btn-primary" href={href("/app/items")}>{labels.newTask} <kbd className="kbd" aria-hidden="true">C</kbd></a>
        <form action="/auth/signout" method="post" className="shell-account" aria-label={labels.account}>
          <span className="shell-avatar" aria-hidden="true">{email.charAt(0).toUpperCase()}</span>
          <span>{email}</span>
          <button type="submit" className="btn btn-plain">{labels.signOut}</button>
        </form>
      </header>
      <aside className="shell-side">
        {inbox}
        {quickLink("mine", labels.mywork)}
        <nav aria-label={labels.main}>
          {GROUPS.map((g) => {
            const group = items.filter((i) => i.group === g);
            return group.length > 0 && (
              <div key={g} role="group" aria-labelledby={`shell-group-${g}`}>
                <h2 id={`shell-group-${g}`} className="shell-group">{labels.group[g]}</h2>
                {group.map(link)}
              </div>
            );
          })}
          {items.some((i) => i.group === "project") && (
            <div role="group" aria-labelledby="shell-group-views">
              <h2 id="shell-group-views" className="shell-group">{labels.views.title}</h2>
              {(["at_risk", "blocked", "week"] as const).map((q) => quickLink(q, labels.views[q]))}
            </div>
          )}
        </nav>
      </aside>
      <div className="shell-body">{children}</div>
      <nav className="shell-bar" aria-label={labels.mobile}>
        {items.filter((i) => i.group === "project").slice(0, 4).map(link)}
      </nav>
    </div>
  );
}
