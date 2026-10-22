import type { ProjectRole } from "./permissions";

export const ROLES: readonly ProjectRole[] = ["project_manager", "member", "contributor"];

export type InviteInput = { email: string; role: ProjectRole };

export function inviteFromForm(form: FormData): InviteInput {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const role = String(form.get("role") ?? "member") as ProjectRole;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("A valid email address is needed");
  if (!ROLES.includes(role)) throw new Error("Unknown role");
  return { email, role };
}

// Plain-text body of the invitation email. The link is the sign-in page; accepting happens on sign-in.
export function inviteEmail(projectName: string, role: string, signInUrl: string): { subject: string; bodyText: string } {
  return {
    subject: `You are invited to ${projectName}`,
    bodyText: `You have been invited to the project "${projectName}" as ${role}.\n\nSign in with this email address to join: ${signInUrl}\n`,
  };
}
