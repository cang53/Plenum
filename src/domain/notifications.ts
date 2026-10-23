export type NotificationKind = "task_assigned" | "suggestion_new" | "invitation_accepted";
export type Notification = { id: string; kind: NotificationKind; subject: string; createdAt: string; read: boolean };

// Where each kind of notification leads.
export function notificationHref(kind: NotificationKind, projectId: string): string {
  const page = { task_assigned: "items", suggestion_new: "items", invitation_accepted: "members" }[kind];
  return `/app/${page}?project=${projectId}`;
}

// The email preferences (S6-9) also decide what the bell counts: a part switched off stays out of it.
export function hiddenKinds(prefs: { digest_suggestions: boolean } | null): NotificationKind[] {
  return prefs && !prefs.digest_suggestions ? ["suggestion_new"] : [];
}
