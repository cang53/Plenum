"use server";

import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/auth/supabase";
import { addLesson, removeDoc } from "@/data/library";
import { safeName } from "@/domain/attachments";
import { excerpt, libraryType, LIBRARY_MAX_BYTES, titleFromFile } from "@/domain/library";
import { attachmentText } from "@/server/attachment-text";

// Adds a lesson to the workspace's shared folder, from a file, from pasted text, or both. The database decides who may.
export async function addLessonDoc(form: FormData): Promise<void> {
  const workspaceId = String(form.get("workspaceId"));
  const file = form.get("file");
  const pasted = String(form.get("text") ?? "").trim().slice(0, 20000);
  const upload = file instanceof File && file.size > 0 ? file : null;
  if (!upload && !pasted) throw new Error("add a file or some text");
  if (upload && (upload.size > LIBRARY_MAX_BYTES || !libraryType(upload.name))) throw new Error("file type or size not allowed");
  const supabase = await supabaseServer();
  const id = crypto.randomUUID();
  let text = pasted;
  let path: string | null = null;
  if (upload) {
    const type = libraryType(upload.name)!;
    const read = await attachmentText([{ filename: upload.name, contentType: type, content: Buffer.from(await upload.arrayBuffer()) }], { limit: 20000, keepLines: true });
    text = [pasted, read.replace(/^\[Attachment [^\]]*\]\n/, "")].filter(Boolean).join("\n\n").slice(0, 20000);
    path = `${workspaceId}/${id}/${safeName(upload.name)}`;
    const up = await supabase.storage.from("library").upload(path, upload, { contentType: type });
    if (up.error) path = null; // the text is still kept; only the original file is missing
  }
  const title = String(form.get("title") ?? "").trim().slice(0, 200) || (upload ? titleFromFile(upload.name) : excerpt(pasted, 60));
  await addLesson(supabase, { id, workspaceId, title, bodyText: text, filename: upload?.name ?? null, contentType: upload ? libraryType(upload.name) : null, sizeBytes: upload?.size ?? null, storagePath: path });
  revalidatePath("/app/library");
}

export async function removeLessonDoc(form: FormData): Promise<void> {
  await removeDoc(await supabaseServer(), String(form.get("id")));
  revalidatePath("/app/library");
}
