"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef, type ReactNode } from "react";
import { Bell } from "./Bell";
import { ThemeToggle } from "./ThemeToggle";
import { CommandMenu } from "./CommandMenu";
import { NavIcon } from "./NavIcon";

type Group = "rail" | "top" | "more";
type Item = { path: string; label: string; group: Group };
type Props = {
  projects: { id: string; name: string }[];
  itemsByProject: Record<string, Item[]>;
  fallbackItems: Item[];
  email: string;
  // The signed-in person's role in each project, already translated.
  roleByProject: Record<string, string>;
  unread: number;
  streamNew: Record<string, number>;
  labels: Record<"brand" | "main" | "projects" | "account" | "signOut" | "bell" | "theme" | "newTask" | "streamNew", string> & { privacy: Record<"body" | "link", string>; menu: React.ComponentProps<typeof CommandMenu>["labels"] };
  // A template with {n}: functions cannot be passed from the server layout to this client component.
  unreadLabel: string;
  children: ReactNode;
};

export function Shell({ projects, itemsByProject, fallbackItems, email, roleByProject, unread, streamNew, unreadLabel, labels, children }: Props) {
  const pathname = usePathname();
  const account = useRef<HTMLDetailsElement>(null);
  // The account menu closes on a click elsewhere or Escape.
  useEffect(() => {
    const shut = (e: Event) => {
      const d = account.current;
      if (d?.open && (e.type === "keydown" ? (e as KeyboardEvent).key === "Escape" : !d.contains(e.target as Node))) d.open = false;
    };
    document.addEventListener("click", shut);
    document.addEventListener("keydown", shut);
    return () => { document.removeEventListener("click", shut); document.removeEventListener("keydown", shut); };
  }, []);
  const chosen = useSearchParams().get("project");
  const project = projects.find((p) => p.id === chosen) ?? projects[0];
  const items = (project && itemsByProject[project.id]) || fallbackItems;
  const href = (path: string) => (project ? `${path}?project=${project.id}` : path);
  const current = (path: string) => (path === "/app" ? pathname === path : pathname.startsWith(path));
  const fresh = project ? (streamNew[project.id] ?? 0) : 0;
  const role = project ? roleByProject[project.id] : undefined;
  const tile = (i: Item) => {
    const badge = i.path === "/app/stream" && fresh > 0;
    return (
      <a key={i.path} href={href(i.path)} title={i.label} className="tile" aria-current={current(i.path) ? "page" : undefined} aria-label={badge ? `${i.label}: ${labels.streamNew.replace("{n}", String(fresh))}` : i.label}>
        <NavIcon name={i.path} />
        {badge && <span className="dot" aria-hidden="true" />}
      </a>
    );
  };
  const rail = items.filter((i) => i.group === "rail");
  const settings = items.find((i) => i.group === "top");
  return (
    <div className="shell">
      <header className="shell-top">
        <a className="shell-brand" href={href("/app")}>
          <svg width="34" height="34" viewBox="0 0 34 34" aria-hidden="true"><rect width="34" height="34" rx="10" fill="currentColor" /><path d="M12 25V9h6.5a5 5 0 0 1 0 10H15" fill="none" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
          {labels.brand}
        </a>
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
        <CommandMenu project={project?.id} labels={labels.menu} />
        <div className="shell-actions">
          <details className="shell-account" ref={account}>
            <summary title={email}>
              <span className="av av-lg" aria-hidden="true">{email.charAt(0).toUpperCase()}</span>
              <span className="shell-who"><span>{email}</span>{role && <span className="muted">{role}</span>}</span>
            </summary>
            <div className="shell-menu">
              <a href="/app/projects">{labels.projects}</a>
              {items.filter((i) => i.group === "more").map((i) => <a key={i.path} href={href(i.path)} aria-current={current(i.path) ? "page" : undefined}>{i.label}</a>)}
              <div className="shell-theme"><span>{labels.theme}</span><ThemeToggle label={labels.theme} /></div>
              <form action="/auth/signout" method="post" aria-label={labels.account}>
                <button type="submit" className="shell-signout">{labels.signOut}</button>
              </form>
            </div>
          </details>
          <Bell icon href={href("/app/notifications")} initial={unread} label={labels.bell} current={pathname.startsWith("/app/notifications")} countLabel={(n) => unreadLabel.replace("{n}", String(n))} />
          {settings && (
            <a className="tile" href={href(settings.path)} title={settings.label} aria-label={settings.label} aria-current={current(settings.path) ? "page" : undefined}><NavIcon name={settings.path} size={20} /></a>
          )}
        </div>
      </header>
      <nav className="shell-rail" aria-label={labels.main}>
        {rail.slice(0, -1).map(tile)}
        <span className="shell-gap" />
        {rail.slice(-1).map(tile)}
      </nav>
      <div className="shell-body">
        {children}
        <footer className="shell-foot">{labels.privacy.body} <a href={href("/app/privacy")}>{labels.privacy.link}</a></footer>
      </div>
    </div>
  );
}
