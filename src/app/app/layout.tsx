import { supabaseServer } from "@/auth/supabase";
import { listProjects, unreadCount } from "@/data/projects";
import { getT } from "@/lib/locale";
import { navItems } from "@/lib/nav";
import { Shell } from "./shell";
import { Shortcuts } from "./Shortcuts";

// Every signed-in page sits in the same floating shell: sidebar, top bar, ambient background.
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
  const items = (role?: string) => navItems(role, Boolean(admin)).map((i) => ({ path: i.path, label: t(i.label) }));
  const itemsByProject = Object.fromEntries(projects.map((p) => [p.id, items(roles[p.id])]));
  return (
    <Shell
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
        search: t("app.search"),
        searchPlaceholder: t("shell.searchPlaceholder"),
        account: t("shell.account"),
        signOut: t("app.signOut"),
        mobile: t("shell.mobile"),
        bell: t("shell.bell"),
      }}
    >
      <Shortcuts labels={{ title: t("shortcuts.title"), close: t("shortcuts.close"), search: t("shortcuts.search"), new: t("shortcuts.new"), next: t("shortcuts.next"), prev: t("shortcuts.prev"), help: t("shortcuts.help") }} />
      {children}
    </Shell>
  );
}
