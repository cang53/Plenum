"use server";

import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/auth/supabase";

// Row-level rules in set_team_goal let only a project manager through.
export async function setTeamGoal(form: FormData): Promise<void> {
  const supabase = await supabaseServer();
  await supabase.rpc("set_team_goal", {
    p: String(form.get("projectId")),
    p_day: new Date().toISOString().slice(0, 10),
    on_: form.get("on") === "1",
  });
  revalidatePath("/app");
}

// Row-level rules let only a project manager write; the author is the signed-in person.
export async function postHealthUpdate(form: FormData): Promise<void> {
  const supabase = await supabaseServer();
  const { error } = await supabase.from("project_updates").insert({
    project_id: String(form.get("projectId")),
    health: String(form.get("health")),
    note: String(form.get("note")).trim(),
  });
  if (error) throw error;
  revalidatePath("/app");
}
