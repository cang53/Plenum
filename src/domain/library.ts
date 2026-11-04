// Library helpers: what a file may be, the type the text reader should use, and short excerpts for lists.
export const LIBRARY_MAX_BYTES = 10 * 1024 * 1024;
const TYPES: Record<string, string> = { pdf: "application/pdf", docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", txt: "text/plain", md: "text/plain", csv: "text/plain" };

// The content type the text reader understands, from the file name (browsers report md and csv inconsistently), or null.
export const libraryType = (filename: string): string | null => TYPES[filename.split(".").pop()?.toLowerCase() ?? ""] ?? null;

export const titleFromFile = (filename: string): string => filename.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim().slice(0, 200) || filename.slice(0, 200);

export const excerpt = (text: string, max = 280): string => {
  const flat = text.replace(/\s+/g, " ").trim();
  return flat.length > max ? `${flat.slice(0, max).trimEnd()}…` : flat;
};

/* --- explorer --- */
export type FolderNode = { path: string; name: string; children: FolderNode[] };

// A folder path from what a person typed: trimmed parts joined by "/", at most 4 levels of 40 characters; null if nothing usable.
export function cleanFolderPath(raw: string): string | null {
  const parts = raw.split("/").map((p) => p.replace(/[\u0000-\u001f]/g, "").trim()).filter((p) => p && p !== "." && p !== "..").slice(0, 4).map((p) => p.slice(0, 40));
  return parts.length ? parts.join("/") : null;
}

// A tree from the folder paths in use; every parent of a path is included.
export function folderTree(paths: string[]): FolderNode[] {
  const roots: FolderNode[] = [];
  const all = new Set(paths.flatMap((p) => p.split("/").map((_, i, a) => a.slice(0, i + 1).join("/"))));
  for (const path of [...all].sort((a, b) => a.localeCompare(b))) {
    const parts = path.split("/");
    const list = parts.length === 1 ? roots : roots.flatMap(function find(n): FolderNode[] { return n.path === parts.slice(0, -1).join("/") ? [n] : n.children.flatMap(find); })[0]?.children;
    list?.push({ path, name: parts[parts.length - 1], children: [] });
  }
  return roots;
}

export type PreviewKind = "image" | "text" | "other";
export const previewKind = (contentType: string | null, filename: string | null): PreviewKind => {
  if (/^image\/(png|jpe?g|gif|webp)$/.test(contentType ?? "")) return "image";
  return libraryType(filename ?? "") || /^(application\/pdf|text\/)/.test(contentType ?? "") ? "text" : "other";
};

export const extLabel = (filename: string | null): string => (filename?.split(".").pop() ?? "").slice(0, 4).toUpperCase() || "FILE";
