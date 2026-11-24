"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef, useSyncExternalStore, type ReactNode } from "react";
import { Bell } from "./Bell";
import { ThemeToggle } from "./ThemeToggle";
import { CommandMenu } from "./CommandMenu";
import { NavIcon } from "./NavIcon";

type Group = "rail" | "top" | "more" | "settings";
type Item = { path: string; label: string; group: Group };
export type Room = { id: string; name: string; emoji: string; general: boolean; threads: { id: string; title: string }[] };

type Props = {
  projects: { id: string; name: string }[];
  // Chatrooms of each project with their latest threads. Missing for a project until the chatroom migration is applied.
  rooms?: Record<string, Room[]>;
  workspace?: string;
  itemsByProject: Record<string, Item[]>;
  fallbackItems: Item[];
  email: string;
  // The signed-in person's role in each project, already translated.
  roleByProject: Record<string, string>;
  unread: number;
  streamNew: Record<string, number>;
  labels: Record<"brand" | "main" | "projects" | "account" | "signOut" | "bell" | "theme" | "newTask" | "streamNew" | "railExpand" | "railCollapse", string> & Partial<Record<"home" | "chatrooms" | "crumbs" | "sections", string>> & { privacy: Record<"body" | "link", string>; menu: React.ComponentProps<typeof CommandMenu>["labels"] };
  // A template with {n}: functions cannot be passed from the server layout to this client component.
  unreadLabel: string;
  children: ReactNode;
};

// Whether the sidebar is open. Kept in localStorage when it works, in memory when it does not.
let sideMemory = true;
const subscribeSide = (cb: () => void) => { window.addEventListener("plenum-side", cb); return () => window.removeEventListener("plenum-side", cb); };
const readSide = () => { try { return localStorage.getItem("plenum-side") !== "closed"; } catch { return sideMemory; } };
const writeSide = (open: boolean) => {
  sideMemory = open;
  try { localStorage.setItem("plenum-side", open ? "open" : "closed"); } catch { /* not saved */ }
  window.dispatchEvent(new Event("plenum-side"));
};

export function Shell({ projects, rooms = {}, workspace, itemsByProject, fallbackItems, email, roleByProject, unread, streamNew, unreadLabel, labels, children }: Props) {
  const pathname = usePathname();
  const account = useRef<HTMLDetailsElement>(null);
  const open = useSyncExternalStore(subscribeSide, readSide, () => true);
  const toggleSide = () => writeSide(!open);
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
  const params = useSearchParams();
  const project = projects.find((p) => p.id === params.get("project")) ?? projects[0];
  const items = (project && itemsByProject[project.id]) || fallbackItems;
  const href = (path: string) => (project ? `${path}?project=${project.id}` : path);
  const current = (path: string) => (path === "/app" ? pathname === path : pathname.startsWith(path));
  const fresh = project ? (streamNew[project.id] ?? 0) : 0;
  const role = project ? roleByProject[project.id] : undefined;
  // The project's pages are tabs above the page; Overview is the sidebar's Home.
  const tabs = items.filter((i) => i.group === "rail" && i.path !== "/app");
  const here = [...items].filter((i) => current(i.path)).sort((a, b) => b.path.length - a.path.length)[0];
  const settings = items.find((i) => i.group === "top");
  const crumbs = [workspace, project?.name, here && here.path !== "/app" ? here.label : undefined].filter(Boolean) as string[];
  const roomId = params.get("room");
  const threadId = params.get("thread");
  const toggle = (cls: string) => (
    <button type="button" className={cls} aria-expanded={open} aria-controls="shell-side" aria-label={open ? labels.railCollapse : labels.railExpand} title={open ? labels.railCollapse : labels.railExpand} onClick={toggleSide}>
      <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><rect x="3.5" y="4.5" width="17" height="15" rx="2.5" fill="none" stroke="currentColor" strokeWidth="1.7" /><path d="M9.5 4.5v15" stroke="currentColor" strokeWidth="1.7" /></svg>
    </button>
  );
  return (
    <div className="shell" data-side={open ? "open" : "closed"}>
      <aside className="shell-side" id="shell-side" aria-label={labels.main}>
        <div className="shell-side-head">
          <a className="shell-brand" href={href("/app")}>
            <svg width="28" height="28" viewBox="0 0 34 34" aria-hidden="true"><rect width="34" height="34" rx="17" fill="currentColor" /><path d="M12 25V9h6.5a5 5 0 0 1 0 10H15" fill="none" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
            {labels.brand}
          </a>
          {toggle("side-toggle")}
        </div>
        <CommandMenu project={project?.id} labels={labels.menu} />
        <nav className="shell-side-nav">
          <a href={href("/app")} aria-current={pathname === "/app" ? "page" : undefined}><NavIcon name="/app" size={18} />{labels.home ?? "Home"}</a>
          <a href="/app/projects" aria-current={pathname.startsWith("/app/projects") ? "page" : undefined}><NavIcon name="/app/library" size={18} />{labels.projects}</a>
        </nav>
        <nav className="shell-tree" aria-label={labels.chatrooms ?? "Chatrooms"}>
          {projects.map((p) => (
            <details key={p.id} open={p.id === project?.id}>
              <summary>{p.name}</summary>
              <ul>
                {(rooms[p.id] ?? []).map((r) => (
                  <li key={r.id}>
                    <a href={`/app/stream?project=${p.id}&room=${r.id}`} aria-current={p.id === project?.id && pathname.startsWith("/app/stream") && (roomId === r.id || (!roomId && r.general)) && !threadId ? "page" : undefined}>
                      <span className="room-mark" aria-hidden="true">{r.emoji || "#"}</span>{r.name}
                      {r.general && p.id === project?.id && fresh > 0 && <span className="dot" role="status" aria-label={labels.streamNew.replace("{n}", String(fresh))} />}
                    </a>
                    {r.threads.length > 0 && (
                      <ul className="room-threads">
                        {r.threads.map((t) => <li key={t.id}><a href={`/app/stream?project=${p.id}&room=${r.id}&thread=${t.id}`} aria-current={threadId === t.id ? "page" : undefined}><span className="room-mark" aria-hidden="true">#</span>{t.title}</a></li>)}
                      </ul>
                    )}
                  </li>
                ))}
                {!rooms[p.id] && <li><a href={`/app/stream?project=${p.id}`}><span className="room-mark" aria-hidden="true">#</span>{items.find((i) => i.path === "/app/stream")?.label}</a></li>}
              </ul>
            </details>
          ))}
        </nav>
        <div className="shell-side-foot">
          <Bell href={href("/app/notifications")} initial={unread} label={labels.bell} current={pathname.startsWith("/app/notifications")} countLabel={(n) => unreadLabel.replace("{n}", String(n))} />
          {settings && <a href={href(settings.path)} aria-current={current(settings.path) ? "page" : undefined}><NavIcon name={settings.path} size={18} />{settings.label}</a>}
          <details className="shell-account" ref={account}>
            <summary title={email}>
              <span className="av av-lg" aria-hidden="true">{email.charAt(0).toUpperCase()}</span>
              <span className="shell-who"><span>{email}</span>{role && <span className="muted">{role}</span>}</span>
            </summary>
            <div className="shell-menu">
              {items.filter((i) => i.group === "more").map((i) => <a key={i.path} href={href(i.path)} aria-current={current(i.path) ? "page" : undefined}>{i.label}</a>)}
              <div className="shell-theme"><span>{labels.theme}</span><ThemeToggle label={labels.theme} /></div>
              <form action="/auth/signout" method="post" aria-label={labels.account}>
                <button type="submit" className="shell-signout">{labels.signOut}</button>
              </form>
            </div>
          </details>
        </div>
      </aside>
      <div className="shell-main">
        <div className="shell-crumbs">
          {toggle("side-toggle side-open")}
          <nav aria-label={labels.crumbs ?? "Breadcrumb"}><ol>{crumbs.map((c, i) => <li key={i} aria-current={i === crumbs.length - 1 ? "page" : undefined}>{c}</li>)}</ol></nav>
        </div>
        {project && tabs.length > 0 && (
          <nav className="shell-tabs" aria-label={labels.sections ?? project.name}>
            {tabs.map((i) => <a key={i.path} href={href(i.path)} aria-current={current(i.path) ? "page" : undefined}>{i.label}</a>)}
          </nav>
        )}
        <div className="shell-body">
          {children}
          <footer className="shell-foot">{labels.privacy.body} <a href={href("/app/privacy")}>{labels.privacy.link}</a></footer>
        </div>
      </div>
    </div>
  );
}
