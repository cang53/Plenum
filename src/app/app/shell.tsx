"use client";

import { usePathname, useSearchParams } from "next/navigation";
import type { ReactNode } from "react";
import { Bell } from "./Bell";

type Group = "project" | "site" | "admin";
type Item = { path: string; label: string; group: Group };
type Props = {
  projects: { id: string; name: string }[];
  itemsByProject: Record<string, Item[]>;
  fallbackItems: Item[];
  email: string;
  unread: number;
  labels: Record<"brand" | "main" | "projects" | "search" | "searchPlaceholder" | "account" | "signOut" | "mobile" | "bell" | "newTask", string> & { group: Record<Group, string> };
  // A template with {n}: functions cannot be passed from the server layout to this client component.
  unreadLabel: string;
  children: ReactNode;
};

const GROUPS: Group[] = ["project", "site", "admin"];

export function Shell({ projects, itemsByProject, fallbackItems, email, unread, unreadLabel, labels, children }: Props) {
  const pathname = usePathname();
  const chosen = useSearchParams().get("project");
  const project = projects.find((p) => p.id === chosen) ?? projects[0];
  const items = (project && itemsByProject[project.id]) || fallbackItems;
  const href = (path: string) => (project ? `${path}?project=${project.id}` : path);
  const current = (path: string) => (path === "/app" ? pathname === path : pathname.startsWith(path));
  const link = (i: Item) => (
    <a key={i.path} href={href(i.path)} className="shell-link" aria-current={current(i.path) ? "page" : undefined}>
      {i.label}
    </a>
  );
  const inbox = (
    <Bell href={href("/app/notifications")} initial={unread} label={labels.bell} current={pathname.startsWith("/app/notifications")} countLabel={(n) => unreadLabel.replace("{n}", String(n))} />
  );
  return (
    <div className="shell">
      <aside className="shell-side">
        <a className="shell-brand" href={href("/app")}>{labels.brand}</a>
        {projects.length > 1 && (
          <details className="shell-projects">
            <summary>{project?.name}</summary>
            <ul aria-label={labels.projects}>
              {projects.map((p) => (
                <li key={p.id}><a href={`${pathname}?project=${p.id}`} aria-current={p.id === project?.id ? "true" : undefined}>{p.name}</a></li>
              ))}
            </ul>
          </details>
        )}
        {projects.length === 1 && <p className="shell-project">{project?.name}</p>}
        {inbox}
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
        </nav>
      </aside>
      <div className="shell-body">
        <header className="shell-top">
          <form action="/app/search" role="search" className="shell-search">
            {project && <input type="hidden" name="project" value={project.id} />}
            <input type="search" name="q" className="field" placeholder={labels.searchPlaceholder} aria-label={labels.search} />
            <kbd className="kbd" aria-hidden="true">/</kbd>
          </form>
          <a className="btn btn-primary" href={href("/app/items")}>{labels.newTask} <kbd className="kbd" aria-hidden="true">N</kbd></a>
          <form action="/auth/signout" method="post" className="shell-account" aria-label={labels.account}>
            <span>{email}</span>
            <button type="submit" className="btn btn-plain">{labels.signOut}</button>
          </form>
        </header>
        {children}
      </div>
      <nav className="shell-bar" aria-label={labels.mobile}>
        {items.filter((i) => i.group === "project").slice(0, 4).map(link)}
      </nav>
    </div>
  );
}
