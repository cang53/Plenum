"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/auth/supabase";
import { createTimeline, deleteTimeline, getTimeline, saveTimeline } from "@/data/timelines";
import { cleanDoc, emptyDoc } from "@/domain/tlDoc";
import { getT } from "@/lib/locale";

const title = (v: unknown, fallback: string) => String(v ?? "").trim().slice(0, 200) || fallback;

// The database decides who may: members and managers write, outside contributors only read.
export async function newTimelineAction(form: FormData): Promise<void> {
  const t = await getT();
  const projectId = String(form.get("projectId"));
  const supabase = await supabaseServer();
  const name = title(form.get("title"), t("timelines.untitled"));
  const doc = emptyDoc(name);
  doc.legend = [{ color: doc.legend[0].color, label: t("timelines.legend.done") }, { color: doc.legend[1].color, label: t("timelines.legend.active") }, { color: doc.legend[2].color, label: t("timelines.legend.planned") }];
  const id = await createTimeline(supabase, projectId, name, doc);
  redirect(`/app/timelines/${id}?project=${projectId}`);
}

// Saves what the editor holds; returns when the database stamped it so the page can show it.
export async function saveTimelineAction(id: string, raw: unknown): Promise<{ updatedAt: string }> {
  const doc = cleanDoc(raw);
  const supabase = await supabaseServer();
  const updatedAt = await saveTimeline(supabase, id, title(doc.title, "Timeline"), doc);
  revalidatePath("/app/timelines");
  return { updatedAt };
}

export async function duplicateTimelineAction(form: FormData): Promise<void> {
  const t = await getT();
  const supabase = await supabaseServer();
  const src = await getTimeline(supabase, String(form.get("id")));
  if (!src) return;
  const name = t("timelines.copyOf").replace("{title}", src.title).slice(0, 200);
  const id = await createTimeline(supabase, src.projectId, name, { ...src.doc, title: name });
  redirect(`/app/timelines/${id}?project=${src.projectId}`);
}

export async function deleteTimelineAction(form: FormData): Promise<void> {
  const supabase = await supabaseServer();
  await deleteTimeline(supabase, String(form.get("id")));
  revalidatePath("/app/timelines");
  redirect(`/app/timelines?project=${String(form.get("projectId"))}`);
}
