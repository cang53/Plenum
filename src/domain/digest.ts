import { t, type Locale } from "@/lib/messages";

export type DigestRow = {
  email: string;
  workspaceId: string;
  projectId: string;
  projectName: string;
  newSuggestions: string[];
  dueTasks: string[];
};

// One person's daily email for one project, or null when there is nothing to say.
export function buildDigest(row: DigestRow, locale: Locale = "en") {
  if (row.newSuggestions.length === 0 && row.dueTasks.length === 0) return null;
  const section = (heading: string, lines: string[]) => (lines.length ? [heading, ...lines.map((l) => `- ${l}`), ""] : []);
  return {
    workspaceId: row.workspaceId,
    projectId: row.projectId,
    to: [row.email],
    subject: `${t("digest.subject", locale)}: ${row.projectName}`,
    bodyText: [
      ...section(t("digest.suggestions", locale), row.newSuggestions),
      ...section(t("digest.due", locale), row.dueTasks),
      t("digest.footer", locale),
    ].join("\n"),
  };
}
