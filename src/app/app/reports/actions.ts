"use server";

import { redirect } from "next/navigation";
import { supabaseServer } from "@/auth/supabase";
import { emailSender } from "@/server/email-config";
import { sendStatusReport, type SentReport } from "@/server/status-report";
import { getT } from "@/lib/locale";

// The click that sends a drafted report. The database checks the person is a project manager and audits it.
export async function sendReport(form: FormData): Promise<void> {
  const projectId = String(form.get("projectId"));
  const t = await getT();
  const supabase = await supabaseServer();
  let ok = true;
  try {
    await sendStatusReport(
      async () => {
        const { data, error } = await supabase.rpc("send_status_report", { p_id: String(form.get("reportId")) });
        if (error || !data?.[0]) throw new Error("send refused");
        return data[0] as SentReport;
      },
      emailSender(),
      (name) => `${t("reports.subject")}: ${name}`,
    );
  } catch {
    ok = false;
  }
  redirect(`/app/reports?project=${projectId}${ok ? "" : "&error=1"}`);
}
