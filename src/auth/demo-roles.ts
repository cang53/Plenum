// MVP demo only: pick a seeded dummy person instead of signing in. Off unless DEMO_ROLE_PICKER=1.
export const DEMO_ROLES = [
  { key: "project_manager", email: "demo.pm@plenum.test" },
  { key: "member", email: "demo.member@plenum.test" },
  { key: "contributor", email: "demo.viewer@plenum.test" },
] as const;

export function demoRolePickerEnabled(env: Record<string, string | undefined> = process.env): boolean {
  return env.DEMO_ROLE_PICKER === "1";
}

export function demoRoleEmail(key: string): string | undefined {
  return DEMO_ROLES.find((r) => r.key === key)?.email;
}
