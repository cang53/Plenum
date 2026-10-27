import { cookies } from "next/headers";
import { supabaseServer } from "@/auth/supabase";
import { listProjects, unreadCount } from "@/data/projects";
import { getT } from "@/lib/locale";
import { navItems } from "@/lib/nav";
import { Shell } from "./shell";
import { Shortcuts } from "./Shortcuts";

// Every signed-in page sits in the same shell: sidebar, top bar, tab bar on phones.
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const t = await getT();
  const supabase = await supabaseServer();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return <>{children}</>;
  const projects = await listProjects(supabase);
  const { data: memberships } = await supabase.from("project_members").select("project_id, role").eq("user_id", data.user.id);
  const roles = Object.fromEntries((memberships ?? []).map((m) => [m.project_id, m.role as string]));
  const { data: ws } = projects[0]
    ? await supabase.from("projects").select("workspace_id").eq("id", projects[0].id).single()
    : { data: null };
  const { data: admin } = ws ? await supabase.rpc("is_workspace_admin", { ws: ws.workspace_id }) : { data: false };
  const items = (role?: string) => navItems(role, Boolean(admin)).map((i) => ({ path: i.path, label: t(i.label), group: i.group }));
  const itemsByProject = Object.fromEntries(projects.map((p) => [p.id, items(roles[p.id])]));
  // New stream messages since the stream was last opened on this device; a first visit shows none, like the New line.
  const jar = await cookies();
  const streamNew = Object.fromEntries(await Promise.all(projects.map(async (p) => {
    const since = jar.get(`stream-read-${p.id}`)?.value;
    if (!since || Number.isNaN(Date.parse(since))) return [p.id, 0];
    const { count } = await supabase.from("messages").select("id", { count: "exact", head: true }).eq("project_id", p.id).gt("received_at", since);
    return [p.id, count ?? 0];
  })));
  return (
    <Shell
      streamNew={streamNew}
      projects={projects.map((p) => ({ id: p.id, name: p.name }))}
      itemsByProject={itemsByProject}
      fallbackItems={items()}
      email={data.user.email ?? ""}
      unread={await unreadCount(supabase)}
      unreadLabel={t("notifications.unread")}
      labels={{
        brand: t("app.name"),
        main: t("shell.main"),
        projects: t("shell.projects"),
        mywork: t("shell.mywork"),
        streamNew: t("shell.streamNew"),
        account: t("shell.account"),
        signOut: t("app.signOut"),
        mobile: t("shell.mobile"),
        bell: t("shell.inbox"),
        newTask: t("shell.newTask"),
        menu: {
          open: t("menu.open"), title: t("menu.title"), placeholder: t("menu.placeholder"), actions: t("menu.actions"), results: t("menu.results"), empty: t("menu.empty"),
          newTask: t("shell.newTask"), search: t("menu.search"), task: t("search.task"), message: t("search.message"), decision: t("search.decision"),
        },
        privacy: { title: t("shell.privacy.title"), body: t("shell.privacy.body"), link: t("shell.privacy.link") },
        views: { title: t("shell.group.views"), at_risk: t("shell.view.at_risk"), blocked: t("shell.view.blocked"), week: t("shell.view.week") },
        group: { project: t("shell.group.project"), site: t("shell.group.site"), admin: t("shell.group.admin") },
      }}
    >
      <Shortcuts labels={{ title: t("shortcuts.title"), close: t("shortcuts.close"), search: t("shortcuts.search"), new: t("shortcuts.new"), next: t("shortcuts.next"), prev: t("shortcuts.prev"), help: t("shortcuts.help") }} />
      {children}
    </Shell>
  );
}
