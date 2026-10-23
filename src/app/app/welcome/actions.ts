"use server";

import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/auth/supabase";
import { ONBOARDED_COOKIE } from "@/domain/onboarding";
import { checkName, slugFrom } from "@/domain/settings";

// The database function refuses anyone who already belongs to a workspace.
export async function onboard(form: FormData): Promise<void> {
  const workspace = checkName(String(form.get("workspace") ?? ""));
  const project = checkName(String(form.get("project") ?? ""));
  if (!workspace.ok || !project.ok) redirect("/app/welcome?error=1");
  const supabase = await supabaseServer();
  const { data, error } = await supabase.rpc("onboard", {
    workspace_name: workspace.value,
    project_name: project.value,
    slug: slugFrom(project.value, randomBytes(2).toString("hex")),
    with_demo: form.get("demo") === "on",
  });
  if (error || !data) redirect("/app/welcome?error=1");
  redirect(`/app/welcome?project=${data}`);
}

export async function finish(): Promise<void> {
  (await cookies()).set(ONBOARDED_COOKIE, "1", { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
  redirect("/app");
}
