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
