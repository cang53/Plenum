import type { MessageKey } from "@/lib/messages";

const SLUG = /^[a-z0-9][a-z0-9-]{1,62}$/;

export type Checked<T> = { ok: true; value: T } | { ok: false; error: MessageKey };

export function checkName(raw: string): Checked<string> {
  const value = raw.trim();
  return value ? { ok: true, value } : { ok: false, error: "settings.invalidName" };
}

// Same rule as the database check; people may type capitals or spaces around it.
export function checkSlug(raw: string): Checked<string> {
  const value = raw.trim().toLowerCase();
  return SLUG.test(value) ? { ok: true, value } : { ok: false, error: "settings.invalidSlug" };
}

// A first email address for a new project: the name made URL-safe plus a short random tail, so it rarely clashes.
export function slugFrom(name: string, tail: string): string {
  const base = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 50);
  return `${base || "project"}-${tail}`;
}

// A Teams "Get link to channel" link holds the channel id in its path and the team id in groupId. An empty box clears the link.
export function checkTeamsLink(raw: string): Checked<{ teamId: string; channelId: string } | null> {
  const text = raw.trim();
  if (!text) return { ok: true, value: null };
  try {
    const url = new URL(text);
    const channelId = decodeURIComponent(url.pathname.match(/\/channel\/([^/]+)/)?.[1] ?? "");
    const teamId = url.searchParams.get("groupId") ?? "";
    if (/^19:[^/\s]+@thread\.(tacv2|skype)$/.test(channelId) && /^[0-9a-f-]{36}$/i.test(teamId)) return { ok: true, value: { teamId, channelId } };
  } catch {}
  return { ok: false, error: "settings.teamsInvalid" };
}
