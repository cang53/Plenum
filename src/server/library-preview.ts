// What the Library shows for one file: an image link, or the readable text. Everything is read as the signed-in person,
// so the document's row-level security (and the storage rules behind it) decide whether it opens at all.
import type { SupabaseClient } from "@supabase/supabase-js";
import { getDoc, listStreamFiles } from "@/data/library";
import { extLabel, libraryType, previewKind, type PreviewKind } from "@/domain/library";
import { attachmentText } from "./attachment-text";

export type Preview = { key: string; title: string; filename: string | null; contentType: string | null; sizeBytes: number | null; kind: PreviewKind; text: string; imageUrl: string | null; downloadUrl: string | null; source: string; ext: string };

const signed = async (client: SupabaseClient, bucket: string, path: string | null) => (path ? (await client.storage.from(bucket).createSignedUrl(path, 600)).data?.signedUrl ?? null : null);

export async function previewFor(client: SupabaseClient, key: string, projectId: string): Promise<Preview | null> {
  const [kindKey, id] = [key.slice(0, 1), key.slice(2)];
  if (!/^[0-9a-f-]{36}$/.test(id)) return null;
  if (kindKey === "d") {
    const d = await getDoc(client, id);
    if (!d) return null;
    const kind = d.storagePath || d.filename ? previewKind(d.contentType, d.filename) : "text";
    const url = await signed(client, "library", d.storagePath);
    return { key, title: d.title, filename: d.filename, contentType: d.contentType, sizeBytes: d.sizeBytes, kind, text: d.bodyText, imageUrl: kind === "image" ? url : null, downloadUrl: url, source: d.folderPath || "", ext: extLabel(d.filename) };
  }
  if (kindKey === "s") {
    const f = (await listStreamFiles(client, projectId)).find((x) => x.id === id);
    if (!f) return null;
    const kind = previewKind(f.contentType, f.filename);
    const url = await signed(client, "message-files", f.storagePath);
    let text = "";
    if (kind === "text") {
      const blob = (await client.storage.from("message-files").download(f.storagePath)).data;
      const type = libraryType(f.filename) ?? f.contentType;
      if (blob) text = (await attachmentText([{ filename: f.filename, contentType: type, content: Buffer.from(await blob.arrayBuffer()) }], { limit: 6000, keepLines: true })).replace(/^\[Attachment [^\]]*\]\n/, "");
    }
    return { key, title: f.filename, filename: f.filename, contentType: f.contentType, sizeBytes: f.sizeBytes, kind, text, imageUrl: kind === "image" ? url : null, downloadUrl: url, source: `${f.subject || f.from}`, ext: extLabel(f.filename) };
  }
  return null;
}
