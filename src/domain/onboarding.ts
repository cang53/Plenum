// Onboarding has two steps. The second (address and invitations) is resumable: it shows until
// the person finishes it, but only for someone alone in a single project with no invitations sent.
export const ONBOARDED_COOKIE = "plenum_onboarded";

export function needsInviteStep(s: { projects: number; members: number; invitations: number; finished: boolean }): boolean {
  return !s.finished && s.projects === 1 && s.members === 1 && s.invitations === 0;
}

export function projectAddress(slug: string, domain: string | undefined): string {
  return domain ? `${slug}@${domain}` : slug;
}
