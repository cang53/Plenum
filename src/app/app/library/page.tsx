import { supabaseServer } from "@/auth/supabase";
import { listFolderPaths, listLessons, listProjectDocs, listStreamFiles } from "@/data/library";
import { currentProject, listProjects } from "@/data/projects";
import { sizeLabel } from "@/domain/attachments";
import { extLabel, folderTree, type FolderNode } from "@/domain/library";
import { getLocale, getT } from "@/lib/locale";
import { intlLocale } from "@/lib/messages";
import { previewFor } from "@/server/library-preview";
import { addLibraryDoc, newLibraryFolder, removeLibraryDoc } from "./actions";
import { LibraryView, type LibraryRow } from "./LibraryView";

const findNode = (nodes: FolderNode[], path: string): FolderNode | undefined => nodes.flatMap((n) => (n.path === path ? [n] : findNode(n.children, path) ?? [])).at(0);

export default async function LibraryPage({ searchParams }: { searchParams: Promise<{ project?: string; at?: string; file?: string }> }) {
  const t = await getT();
  const sp = await searchParams;
  const supabase = await supabaseServer();
  const project = currentProject(await listProjects(supabase), sp.project);
  if (!project) return <main id="main" className="page"><p>{t("projects.empty")}</p></main>;
  const { data: pr } = await supabase.from("projects").select("workspace_id").eq("id", project.id).single();
  const workspaceId = pr?.workspace_id as string;
  const locale = intlLocale[await getLocale()];
  const [lessons, docs, folderPaths, stream, staff, manager] = await Promise.all([
    listLessons(supabase, workspaceId).catch(() => []), listProjectDocs(supabase, project.id).catch(() => []), listFolderPaths(supabase, project.id).catch(() => []),
    listStreamFiles(supabase, project.id).catch(() => []), supabase.rpc("is_workspace_staff", { ws: workspaceId }), supabase.rpc("can_manage_project", { p: project.id }),
  ]);
  const at = sp.at === "lessons" || sp.at === "stream" || sp.at?.startsWith("p:") ? sp.at : "p:";
  const tree = folderTree([...folderPaths, ...docs.map((d) => d.folderPath).filter(Boolean)]);
  const counts: Record<string, number> = { lessons: lessons.length, stream: stream.length, "p:": docs.filter((d) => d.folderPath === "").length };
  for (const d of docs) if (d.folderPath) counts[`p:${d.folderPath}`] = (counts[`p:${d.folderPath}`] ?? 0) + 1;
  const date = (iso: string) => new Date(iso).toLocaleDateString(locale, { day: "numeric", month: "short", year: "numeric" });
  const fileRow = (key: string, title: string, filename: string | null, size: number | null, iso: string): LibraryRow => ({ key, title, ext: extLabel(filename), meta: [size ? sizeLabel(size) : "", date(iso)].filter(Boolean).join(" · ") });
  const path = at.startsWith("p:") ? at.slice(2) : "";
  let rows: LibraryRow[] = [];
  if (at === "lessons") rows = lessons.map((d) => fileRow(`d:${d.id}`, d.title, d.filename, d.sizeBytes, d.createdAt));
  else if (at === "stream") rows = stream.map((f) => fileRow(`s:${f.id}`, f.filename, f.filename, f.sizeBytes, f.sentAt));
  else rows = docs.filter((d) => d.folderPath === path).map((d) => fileRow(`d:${d.id}`, d.title, d.filename, d.sizeBytes, d.createdAt));
  const subfolders = at.startsWith("p:") ? (path ? findNode(tree, path)?.children ?? [] : tree) : [];
  const crumbs = [{ label: t("library.projectFiles"), at: "p:" }, ...path.split("/").filter(Boolean).map((p, i, a) => ({ label: p, at: `p:${a.slice(0, i + 1).join("/")}` }))];
  const heading = at === "lessons" ? t("library.lessons") : at === "stream" ? t("library.stream") : crumbs[crumbs.length - 1].label;
  const selected = rows.find((r) => r.key === sp.file)?.key ?? null;
  const preview = selected ? await previewFor(supabase, selected, project.id).catch(() => null) : null;
  const projectParam = sp.project ?? "";
  const href = (a: string, file?: string | null) => `/app/library?${new URLSearchParams({ ...(projectParam ? { project: projectParam } : {}), at: a, ...(file ? { file } : {}) })}`;
  return (
    <LibraryView t={t} project={project} workspaceId={workspaceId} projectParam={projectParam} at={at} heading={heading} crumbs={at.startsWith("p:") ? crumbs : []} tree={tree} counts={counts}
      subfolders={subfolders} rows={rows} selected={selected} preview={preview} canWrite={at === "lessons" ? Boolean(staff.data) : at === "stream" ? false : Boolean(manager.data)} canCreateFolder={Boolean(manager.data)} href={href}
      actions={{ add: addLibraryDoc, remove: removeLibraryDoc, newFolder: newLibraryFolder }} />
  );
}
