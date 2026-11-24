"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { Bell } from "./Bell";
import { ThemeToggle } from "./ThemeToggle";
import { CommandMenu } from "./CommandMenu";
import { SideIcon } from "./SideIcons";
import { createChatroom } from "./actions";

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
  labels: Record<"brand" | "main" | "projects" | "account" | "signOut" | "bell" | "theme" | "newTask" | "streamNew" | "railExpand" | "railCollapse", string> & Partial<Record<"home" | "chatrooms" | "crumbs" | "sections" | "search" | "myChatroom" | "addChatroom" | "chatroomName", string>> & { privacy: Record<"body" | "link", string>; menu: React.ComponentProps<typeof CommandMenu>["labels"] };
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
  const [adding, setAdding] = useState(false);
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
      {cls.includes("side-open") ? <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><rect x="3.5" y="4.5" width="17" height="15" rx="2.5" fill="none" stroke="currentColor" strokeWidth="1.7" /><path d="M9.5 4.5v15" stroke="currentColor" strokeWidth="1.7" /></svg> : <SideIcon name="collapse" size={20} />}
    </button>
  );
  return (
    <div className="shell" data-side={open ? "open" : "closed"}>
      <aside className="shell-side" id="shell-side" aria-label={labels.main}>
        <div className="side-head">
          <a className="side-brand" href={href("/app")}>
            <span className="side-emblem" aria-hidden="true" />
            <span className="side-name">{workspace ?? labels.brand}</span>
          </a>
          <span className="side-chevs" aria-hidden="true"><SideIcon name="chevrons" size={16} /></span>
          {toggle("side-toggle")}
        </div>
        <nav className="side-nav">
          <a className="side-row" href={href("/app")} aria-current={pathname === "/app" ? "page" : undefined}><SideIcon name="home" />{labels.home ?? "Home"}</a>
          <CommandMenu project={project?.id} labels={{ ...labels.menu, open: labels.search ?? labels.menu.open }} />
          <a className="side-row side-gap" href="/app/projects" aria-current={pathname.startsWith("/app/projects") ? "page" : undefined}><SideIcon name="bag" />{labels.projects}</a>
          <a className="side-row" href={href("/app/library")} aria-current={current("/app/library") ? "page" : undefined}><SideIcon name="play" />{items.find((i) => i.path === "/app/library")?.label ?? "Library"}</a>
        </nav>
        <div className="side-mine">
          <span>{labels.myChatroom ?? "My Chatroom"}</span>
          {project && <button type="button" className="side-plus" aria-label={labels.addChatroom} aria-expanded={adding} onClick={() => setAdding(!adding)}><SideIcon name="add" size={10} /></button>}
        </div>
        <nav className="shell-tree" aria-label={labels.chatrooms ?? "Chatrooms"}>
          {projects.map((p) => (
            <details key={p.id} open={p.id === project?.id}>
              <summary><span className="side-badge"><span className="side-emblem side-emblem-sm" aria-hidden="true" /><span>{p.name}</span></span></summary>
              <ul className="side-rooms">
                {(rooms[p.id] ?? []).map((r) => (
                  <li key={r.id}>
                    <a className="side-row" href={`/app/stream?project=${p.id}&room=${r.id}`} aria-current={p.id === project?.id && pathname.startsWith("/app/stream") && (roomId === r.id || (!roomId && r.general)) && !threadId ? "page" : undefined}>
                      <span className="room-mark" aria-hidden="true">{r.emoji || "#"}</span><span className="side-text">{r.name}</span>
                      {r.general && p.id === project?.id && fresh > 0 && <span className="dot" role="status" aria-label={labels.streamNew.replace("{n}", String(fresh))} />}
                    </a>
                    {r.threads.length > 0 && (
                      <ul className="room-threads">
                        {r.threads.map((t) => <li key={t.id}><a className="side-row" href={`/app/stream?project=${p.id}&room=${r.id}&thread=${t.id}`} aria-current={threadId === t.id ? "page" : undefined}><SideIcon name="hash" size={20} /><span className="side-text">{t.title}</span></a></li>)}
                      </ul>
                    )}
                  </li>
                ))}
                {!rooms[p.id] && <li><a className="side-row" href={`/app/stream?project=${p.id}`}><span className="room-mark" aria-hidden="true">#</span><span className="side-text">{items.find((i) => i.path === "/app/stream")?.label}</span></a></li>}
                {p.id === project?.id && rooms[p.id] && (
                  <li>
                    {adding ? (
                      <form className="side-add" action={createChatroom}>
                        <input type="hidden" name="projectId" value={p.id} />
                        <input name="name" className="side-input" required maxLength={80} autoFocus autoComplete="off" aria-label={labels.chatroomName} placeholder={labels.chatroomName} />
                      </form>
                    ) : (
                      <button type="button" className="side-row side-addrow" onClick={() => setAdding(true)}><SideIcon name="plus" />{labels.addChatroom}</button>
                    )}
                  </li>
                )}
              </ul>
            </details>
          ))}
        </nav>
        <div className="shell-side-foot">
          <Bell href={href("/app/notifications")} initial={unread} label={labels.bell} current={pathname.startsWith("/app/notifications")} countLabel={(n) => unreadLabel.replace("{n}", String(n))} />
          {settings && <a className="side-row" href={href(settings.path)} aria-current={current(settings.path) ? "page" : undefined}><SideIcon name="gear" />{settings.label}</a>}
          <details className="shell-account" ref={account}>
            <summary title={email}>
              <span className="av side-av" aria-hidden="true">{email.charAt(0).toUpperCase()}</span>
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
          <a className="side-cta" href={href("/app/items")}>{labels.newTask}<SideIcon name="add" size={22} /></a>
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
