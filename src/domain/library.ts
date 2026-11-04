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
