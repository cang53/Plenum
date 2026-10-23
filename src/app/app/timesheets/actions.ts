"use server";

import { redirect } from "next/navigation";
import { supabaseServer } from "@/auth/supabase";
import { setTimesheetWeek, submitTimesheetWeek } from "@/data/live";
import { checkDecision, checkPicks, weekStart } from "@/domain/timesheet";

async function run(projectId: string, work: () => Promise<void>): Promise<never> {
  let result = "done=1";
  try {
    await work();
  } catch {
    result = "error=timesheets.error";
  }
  redirect(`/app/timesheets?project=${projectId}&${result}`);
}

export async function submitWeek(form: FormData): Promise<void> {
  const projectId = String(form.get("projectId"));
  const client = await supabaseServer();
  const { data } = await client.auth.getUser();
  await run(projectId, async () => {
    if (!data.user) throw new Error("not signed in");
    await submitTimesheetWeek(client, projectId, data.user.id, weekStart(new Date().toISOString().slice(0, 10)));
  });
}

export async function decideWeek(form: FormData): Promise<void> {
  const projectId = String(form.get("projectId"));
  const d = checkDecision(form);
  await run(projectId, async () => {
    if (!d) throw new Error("invalid");
    await setTimesheetWeek(await supabaseServer(), projectId, d.user, d.week, { status: d.decision, note: d.note });
  });
}

// Approves every ticked week; the database still checks each one, so a single refusal stops with an error.
export async function approveWeeks(form: FormData): Promise<void> {
  const projectId = String(form.get("projectId"));
  const picks = checkPicks(form);
  await run(projectId, async () => {
    if (!picks.length) throw new Error("nothing selected");
    const client = await supabaseServer();
    for (const p of picks) await setTimesheetWeek(client, projectId, p.user, p.week, { status: "approved" });
  });
}
