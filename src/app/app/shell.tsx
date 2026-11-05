"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { Bell } from "./Bell";
import { ThemeToggle } from "./ThemeToggle";
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
  labels: Record<"brand" | "main" | "projects" | "account" | "signOut" | "mobile" | "collapse" | "expand" | "bell" | "theme" | "newTask" | "mywork" | "streamNew", string> & { privacy: Record<"title" | "body" | "link", string>; menu: React.ComponentProps<typeof CommandMenu>["labels"]; group: Record<Group, string> };
  // A template with {n}: functions cannot be passed from the server layout to this client component.
  unreadLabel: string;
  children: ReactNode;
};

const GROUPS: Group[] = ["project", "site", "admin"];
const NARROW = "(max-width: 48rem)";

// The choice is kept in this browser so it stays the same on every screen; phones always start closed.
const savedNav = (): "open" | "closed" | undefined => {
  try {
    const v = localStorage.getItem("nav");
    return (v === "open" || v === "closed") && !window.matchMedia(NARROW).matches ? v : undefined;
  } catch { return undefined; }
};

export function Shell({ projects, itemsByProject, fallbackItems, email, unread, streamNew, unreadLabel, labels, children }: Props) {
  const pathname = usePathname();
  // Until the person toggles it, the side bar is open on wide windows and hidden on narrow ones (CSS decides).
  const saved = useSyncExternalStore(() => () => {}, savedNav, () => undefined);
  const [chosenNav, setNav] = useState<"open" | "closed" | undefined>(undefined);
  const nav = chosenNav ?? saved;
  const [shut, setShut] = useState<Group[]>([]);
  const collapsed = nav === "closed";
  const toggleNav = () => {
    const next = (nav ?? (window.matchMedia(NARROW).matches ? "closed" : "open")) === "open" ? "closed" : "open";
    setNav(next);
    try { localStorage.setItem("nav", next); } catch {}
  };
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
  const toggleGroup = (g: Group) => setShut((x) => (x.includes(g) ? x.filter((y) => y !== g) : [...x, g]));
  const chosen = useSearchParams().get("project");
  const project = projects.find((p) => p.id === chosen) ?? projects[0];
  const items = (project && itemsByProject[project.id]) || fallbackItems;
  const href = (path: string) => (project ? `${path}?project=${project.id}` : path);
  const current = (path: string) => (path === "/app" ? pathname === path : pathname.startsWith(path));
  const fresh = project ? (streamNew[project.id] ?? 0) : 0;
  const link = (i: Item) => {
    const badge = i.path === "/app/stream" && fresh > 0;
    return (
      <a key={i.path} href={href(i.path)} title={i.label} className={`shell-link${badge ? " shell-unread" : ""}`} aria-current={current(i.path) ? "page" : undefined} aria-label={badge ? `${i.label}: ${labels.streamNew.replace("{n}", String(fresh))}` : undefined}>
        <span aria-hidden={badge || undefined}>{i.label}</span>
        {badge && <span className="shell-badge" aria-hidden="true">{fresh > 99 ? "99+" : fresh}</span>}
      </a>
    );
  };
  const quick = (q: string) => `/app/items?${project ? `project=${project.id}&` : ""}quick=${q}`;
  const quickLink = (q: string, label: string) => (
    <a key={q} href={quick(q)} title={label} className="shell-link" aria-current={pathname === "/app/items" && quickNow === q ? "page" : undefined}><span>{label}</span></a>
  );
  const quickNow = useSearchParams().get("quick");
  const inbox = (
    <Bell icon href={href("/app/notifications")} initial={unread} label={labels.bell} current={pathname.startsWith("/app/notifications")} countLabel={(n) => unreadLabel.replace("{n}", String(n))} />
  );
  return (
    <div className="shell" data-nav={nav}>
      <header className="shell-top">
        <button type="button" className="shell-toggle" aria-label={labels.mobile} aria-controls="shell-side" aria-expanded={nav === undefined ? undefined : nav === "open"} onClick={toggleNav} />
        <a className="shell-brand" href={href("/app")}><span className="shell-logo" aria-hidden="true">{labels.brand.charAt(0).toUpperCase()}</span>{labels.brand}</a>
        <a className="shell-crumb shell-crumb-link" href="/app/projects">{labels.projects} /</a>
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
        <div className="shell-actions">
          <CommandMenu project={project?.id} labels={labels.menu} />
          {inbox}
          <ThemeToggle label={labels.theme} />
          <details className="shell-account" ref={account}>
            <summary aria-label={labels.account} title={email}><span className="shell-avatar" aria-hidden="true">{email.charAt(0).toUpperCase()}</span></summary>
            <form action="/auth/signout" method="post" aria-label={labels.account}>
              <p className="shell-email">{email}</p>
              <button type="submit" className="shell-signout">{labels.signOut}</button>
            </form>
          </details>
        </div>
      </header>
      <aside className="shell-side" id="shell-side">
        <div className="shell-capsule">
        <button type="button" className="shell-collapse" aria-label={collapsed ? labels.expand : labels.collapse} title={collapsed ? labels.expand : labels.collapse} aria-controls="shell-side" aria-expanded={!collapsed} onClick={toggleNav} />
        {quickLink("mine", labels.mywork)}
        <nav aria-label={labels.main}>
          {GROUPS.map((g) => {
            const group = items.filter((i) => i.group === g);
            return group.length > 0 && (
              <div key={g} role="group" aria-labelledby={`shell-group-${g}`}>
                <h2 id={`shell-group-${g}`} className="shell-group">
                  <button type="button" aria-expanded={!shut.includes(g)} onClick={() => toggleGroup(g)}>{labels.group[g]}</button>
                </h2>
                {!shut.includes(g) && group.map(link)}
              </div>
            );
          })}
        </nav>
        </div>
        <section className="shell-privacy" aria-label={labels.privacy.title}>
          <strong>{labels.privacy.title}</strong>
          <p>{labels.privacy.body}</p>
          <a href={href("/app/privacy")}>{labels.privacy.link}</a>
        </section>
      </aside>
      <div className="shell-body">{children}</div>
      <button type="button" className="shell-scrim" tabIndex={-1} aria-hidden="true" onClick={toggleNav} />
    </div>
  );
}
