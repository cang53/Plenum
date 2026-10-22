"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/auth/supabase";
import { checkName, checkSlug } from "@/domain/settings";
import { LOCALE_COOKIE } from "@/lib/locale";
import { isLocale } from "@/lib/messages";

function back(projectId: string, result: string): never {
  redirect(`/app/settings?project=${projectId}&${result}`);
}

// Row-level security limits this to the person's own profile.
export async function saveProfile(form: FormData): Promise<void> {
  const projectId = String(form.get("projectId"));
  const name = checkName(String(form.get("displayName") ?? ""));
  const locale = String(form.get("locale"));
  if (!name.ok) back(projectId, `error=${name.error}`);
  if (!isLocale(locale)) back(projectId, "error=settings.saveError");
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  const { error } = await supabase
    .from("profiles")
    .update({ display_name: name.value, locale })
    .eq("id", user?.id ?? "");
  if (error) back(projectId, "error=settings.saveError");
  (await cookies()).set(LOCALE_COOKIE, locale, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
  revalidatePath("/app", "layout");
  back(projectId, "saved=1");
}

// Row-level security lets only project managers update the project.
export async function saveProject(form: FormData): Promise<void> {
  const projectId = String(form.get("projectId"));
  const name = checkName(String(form.get("name") ?? ""));
  const slug = checkSlug(String(form.get("slug") ?? ""));
  if (!name.ok) back(projectId, `error=${name.error}`);
  if (!slug.ok) back(projectId, `error=${slug.error}`);
  const supabase = await supabaseServer();
  const { data, error } = await supabase
    .from("projects")
    .update({ name: name.value, email_slug: slug.value })
    .eq("id", projectId)
    .select("id");
  if (error?.code === "23505") back(projectId, "error=settings.slugTaken");
  if (error || !data?.length) back(projectId, "error=settings.saveError");
  revalidatePath("/app", "layout");
  back(projectId, "saved=1");
}
