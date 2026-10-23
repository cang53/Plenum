// Draft a week of hours from the person's own task activity. Falls back to the offline rules when the AI switch is off,
// the daily cap is used up, or the model fails. Nothing is saved: the person reviews the grid and clicks save.
import { logError } from "@/lib/log";
import { buildTimesheetDraftPrompt, parseTimesheetDraft, rulesDraft, TIMESHEET_DRAFT_SYSTEM_PROMPT, type Activity } from "@/domain/timesheetDraft";
import type { HoursInput } from "@/domain/timesheet";
import type { Ask } from "./triage";
import { ruleBasedAsk } from "./triage-fake";

export async function draftTimesheet(projectId: string, activity: Activity[], takeCall: (projectId: string) => Promise<boolean>, ask: Ask): Promise<HoursInput[]> {
  if (!activity.length) return [];
  if (ask !== ruleBasedAsk && (await takeCall(projectId))) {
    try {
      const drafted = parseTimesheetDraft(await ask(TIMESHEET_DRAFT_SYSTEM_PROMPT, buildTimesheetDraftPrompt(activity)), activity);
      if (drafted) return drafted;
    } catch (error) {
      logError("Bedrock timesheet draft failed", error);
    }
  }
  return rulesDraft(activity);
}
