"use client";

import { usePathname, useSearchParams } from "next/navigation";
import type { ReactNode } from "react";

type Item = { path: string; label: string };
type Props = {
  projects: { id: string; name: string }[];
  itemsByProject: Record<string, Item[]>;
  fallbackItems: Item[];
  email: string;
  labels: Record<"brand" | "main" | "projects" | "search" | "searchPlaceholder" | "account" | "signOut" | "mobile", string>;
  children: ReactNode;
};

export function Shell({ projects, itemsByProject, fallbackItems, email, labels, children }: Props) {
  const pathname = usePathname();
  const chosen = useSearchParams().get("project");
  const project = projects.find((p) => p.id === chosen) ?? projects[0];
  const items = (project && itemsByProject[project.id]) || fallbackItems;
  const href = (path: string) => (project ? `${path}?project=${project.id}` : path);
  const current = (path: string) => (path === "/app" ? pathname === path : pathname.startsWith(path));
  const link = (i: Item) => (
    <a key={i.path} href={href(i.path)} className="shell-link" aria-current={current(i.path) ? "page" : undefined}>
      <span className="shell-glyph" aria-hidden="true">{i.label.charAt(0)}</span>
      <span className="shell-label">{i.label}</span>
    </a>
  );
  return (
    <div className="ambient shell">
      <aside className="glass shell-side">
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
        <nav aria-label={labels.main}>{items.map(link)}</nav>
      </aside>
      <div className="shell-body">
        <header className="shell-top">
          <form action="/app/search" role="search" className="shell-search">
            {project && <input type="hidden" name="project" value={project.id} />}
            <input type="search" name="q" className="field" placeholder={labels.searchPlaceholder} aria-label={labels.search} />
          </form>
          <form action="/auth/signout" method="post" className="shell-account" aria-label={labels.account}>
            <span>{email}</span>
            <button type="submit" className="btn btn-plain">{labels.signOut}</button>
          </form>
        </header>
        {children}
      </div>
      <nav className="glass shell-bar" aria-label={labels.mobile}>
        {items.slice(0, 5).map(link)}
      </nav>
    </div>
  );
}
