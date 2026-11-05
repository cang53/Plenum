export type TreeParent = { id: string; name: string };
export type TreeProject = { id: string; name: string; parent_id?: string | null; done?: number; total?: number; blocked?: number; health?: "ok" | "warn" | "bad"; next?: string; nextDate?: string };
export type Block = { parent: TreeParent | null; projects: TreeProject[] };

const byName = (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name);

// Parent projects with the projects below them, plus one block for projects without a parent.
// A search keeps projects whose own or parent's name matches; empty parents show only without a search.
export function buildTree(parents: TreeParent[], projects: TreeProject[], query = ""): Block[] {
  const q = query.trim().toLowerCase();
  const hit = (name: string) => !q || name.toLowerCase().includes(q);
  const known = new Set(parents.map((p) => p.id));
  const blocks: Block[] = [...parents].sort(byName).map((parent) => ({
    parent,
    projects: projects.filter((p) => p.parent_id === parent.id && (hit(p.name) || hit(parent.name))).sort(byName),
  }));
  const alone = projects.filter((p) => (!p.parent_id || !known.has(p.parent_id)) && hit(p.name)).sort(byName);
  const shown = blocks.filter((b) => b.projects.length > 0 || (!q && b.parent));
  return alone.length ? [...shown, { parent: null, projects: alone }] : shown;
}
