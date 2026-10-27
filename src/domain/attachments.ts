// Files a person adds to a Plenum message. The same limits are checked in the browser, in the server action and in the database.
export const MAX_FILES = 5;
export const MAX_TOTAL_BYTES = 10 * 1024 * 1024; // the server action body limit is 11 MB
const TYPES = [/^image\/(png|jpe?g|gif|webp)$/, /^application\/pdf$/, /^text\/(plain|csv)$/, /^application\/(msword|vnd\.ms-excel|zip)$/, /^application\/vnd\.openxmlformats-officedocument\./];

export type FileError = "stream.file.tooMany" | "stream.file.tooBig" | "stream.file.type";
export type FileInfo = { name: string; type: string; size: number };

export function checkFiles(files: FileInfo[]): FileError | null {
  if (files.length > MAX_FILES) return "stream.file.tooMany";
  if (files.reduce((n, f) => n + f.size, 0) > MAX_TOTAL_BYTES) return "stream.file.tooBig";
  return files.every((f) => TYPES.some((r) => r.test(f.type))) ? null : "stream.file.type";
}

// Keeps letters, digits, dot, dash and underscore, so the name is safe inside a storage path.
export const safeName = (name: string): string => name.normalize("NFKD").replace(/[^\w.-]+/g, "_").replace(/^\.+/, "").slice(-80) || "file";

export const isImage = (type: string): boolean => /^image\//.test(type);
export const sizeLabel = (bytes: number): string => (bytes >= 1048576 ? `${(bytes / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`);
