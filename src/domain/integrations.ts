import type { Switch } from "@/server/switches";
import type { MessageKey } from "@/lib/messages";

export type IntegrationRow = { name: string; reads: MessageKey; live: boolean; lastRead: string | null };

// What each provider reads, whether its switch is on, and when it last did something we can see.
// Only email (messages) and triage (suggestions) leave a trace; the others show no time.
export function integrationRows(switches: Switch[], last: { email: string | null; triage: string | null }): IntegrationRow[] {
  const meta: Record<string, { reads: MessageKey; lastRead: string | null }> = {
    AUTH_PROVIDER: { reads: "integrations.reads.auth", lastRead: null },
    EMAIL_PROVIDER: { reads: "integrations.reads.email", lastRead: last.email },
    AI_PROVIDER: { reads: "integrations.reads.triage", lastRead: last.triage },
    TEAMS_PROVIDER: { reads: "integrations.reads.teams", lastRead: null },
  };
  return switches.map((s) => ({ name: s.name, live: s.live, ...meta[s.flag] }));
}
