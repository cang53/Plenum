// What each project role may do, from the v1 product spec ("Users and roles").
// The database enforces access to data; this table drives what the interface offers.

export type ProjectRole = "project_manager" | "member" | "contributor";

export type Action =
  | "project.edit"
  | "members.manage"
  | "plan.edit"
  | "task.updateAssigned"
  | "suggestion.approveAny"
  | "suggestion.approveOwnTask"
  | "message.reply"
  | "hours.log"
  | "timesheet.approve"
  | "report.send";

const allowed: Record<ProjectRole, readonly Action[]> = {
  project_manager: [
    "project.edit",
    "members.manage",
    "plan.edit",
    "task.updateAssigned",
    "suggestion.approveAny",
    "suggestion.approveOwnTask",
    "message.reply",
    "hours.log",
    "timesheet.approve",
    "report.send",
  ],
  member: ["task.updateAssigned", "suggestion.approveOwnTask", "message.reply", "hours.log"],
  contributor: ["task.updateAssigned", "message.reply", "hours.log"],
};

export function can(role: ProjectRole | null | undefined, action: Action): boolean {
  return role ? allowed[role].includes(action) : false;
}

// Workspace admins act as project managers on every project in their workspace.
export function effectiveRole(
  projectRole: ProjectRole | null | undefined,
  isWorkspaceAdmin: boolean,
): ProjectRole | null {
  return isWorkspaceAdmin ? "project_manager" : (projectRole ?? null);
}
