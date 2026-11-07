import { initials } from "@/domain/board";
import { ROLES } from "@/domain/invitations";

type Person = { name: string; email: string; role: string };
type Invite = { email: string; role: string };
export type CrewCard = { role: string; people: { initials: string; name: string }[]; pending: { initials: string; email: string }[] };

// The Crew band groups people by project role, in a fixed role order. Phase leads and phase members
// are not stored yet (design/BACKLOG.md), so the cards say who has which role and nothing more:
// no counts per person, no workload, no presence. Roles nobody holds are left out.
export function crewByRole(label: (role: string) => string, members: Person[], invites: Invite[]): CrewCard[] {
  return ROLES.map((role) => ({
    role: label(role),
    people: members.filter((m) => m.role === role).map((m) => { const name = m.name || m.email; return { initials: initials(name), name }; }),
    pending: invites.filter((i) => i.role === role).map((i) => ({ initials: initials(i.email), email: i.email })),
  })).filter((c) => c.people.length + c.pending.length > 0);
}
