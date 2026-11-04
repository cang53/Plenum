"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/auth/supabase";
import { addDoc, createFolder, removeDoc } from "@/data/library";
import { safeName } from "@/domain/attachments";
import { cleanFolderPath, excerpt, libraryType, LIBRARY_MAX_BYTES, titleFromFile } from "@/domain/library";
import { attachmentText } from "@/server/attachment-text";

const back = (form: FormData, at: string) => `/app/library?${new URLSearchParams({ ...(form.get("project") ? { project: String(form.get("project")) } : {}), at })}`;

// Adds a document: to the shared lessons folder (no projectId) or to a folder of the project. The database decides who may.
// The text of a readable file is stored so the AI analysis and the preview can show it.
export async function addLibraryDoc(form: FormData): Promise<void> {
  const workspaceId = String(form.get("workspaceId"));
  const projectId = String(form.get("projectId") ?? "") || null;
  const folderPath = projectId ? (cleanFolderPath(String(form.get("path") ?? "")) ?? "") : "";
  const file = form.get("file");
  const pasted = String(form.get("text") ?? "").trim().slice(0, 20000);
  const upload = file instanceof File && file.size > 0 ? file : null;
  if (!upload && !pasted) throw new Error("add a file or some text");
  if (upload && upload.size > LIBRARY_MAX_BYTES) throw new Error("file too big");
  const supabase = await supabaseServer();
  const id = crypto.randomUUID();
  let text = pasted;
  let path: string | null = null;
  const type = upload ? libraryType(upload.name) ?? (upload.type || "application/octet-stream") : null;
  if (upload) {
    if (libraryType(upload.name)) {
      const read = await attachmentText([{ filename: upload.name, contentType: type!, content: Buffer.from(await upload.arrayBuffer()) }], { limit: 20000, keepLines: true });
      text = [pasted, read.replace(/^\[Attachment [^\]]*\]\n/, "")].filter(Boolean).join("\n\n").slice(0, 20000);
    }
    path = `${workspaceId}/${projectId ? `${projectId}/` : ""}${id}/${safeName(upload.name)}`;
    const up = await supabase.storage.from("library").upload(path, upload, { contentType: type! });
    if (up.error) path = null; // the text is still kept; only the original file is missing
  }
  const title = String(form.get("title") ?? "").trim().slice(0, 200) || (upload ? titleFromFile(upload.name) : excerpt(pasted, 60));
  await addDoc(supabase, { id, workspaceId, projectId, folderPath, title, bodyText: text, filename: upload?.name ?? null, contentType: type, sizeBytes: upload?.size ?? null, storagePath: path });
  revalidatePath("/app/library");
  redirect(`${back(form, projectId ? `p:${folderPath}` : "lessons")}&file=d:${id}`);
}

export async function removeLibraryDoc(form: FormData): Promise<void> {
  await removeDoc(await supabaseServer(), String(form.get("id")));
  revalidatePath("/app/library");
  redirect(back(form, String(form.get("at") ?? "lessons")));
}

export async function newLibraryFolder(form: FormData): Promise<void> {
  const parent = String(form.get("parent") ?? "");
  const path = cleanFolderPath(`${parent}/${String(form.get("name") ?? "")}`);
  if (!path) throw new Error("folder name is required");
  await createFolder(await supabaseServer(), String(form.get("projectId")), path);
  revalidatePath("/app/library");
  redirect(back(form, `p:${path}`));
}
