import { logError, logEvent } from "@/lib/log";

// Teams behind one small interface, like email. Fake keeps posts in memory. Live (TEAMS_PROVIDER=live) reads each mapped
// channel through Microsoft Graph (app permission ChannelMessage.Read.All) and posts through a Teams Workflows webhook,
// because Graph does not let an app post channel messages as itself.
export type TeamsPost = { projectSlug: string; kind: "celebration" | "message"; text: string; inReplyTo?: string };

export type TeamsPoster = { post: (post: TeamsPost) => Promise<void> };

// TEAMS_CHANNELS: {"<project slug>": {"channel": "<channel id>", "webhook": "<Workflows URL>"}}. Only mapped projects are read or posted to.
export type TeamsChannels = Record<string, { channel: string; team?: string; webhook?: string }>;

// The log keeps only the kind of failure, so the HTTP status rides on the error.
// The name says which call failed and the code is Graph's own error code (a fixed word such as Forbidden), never message text.
const httpError = (name: string, message: string, status: number, code?: string) => Object.assign(new Error(message), { name, status, ...(code ? { code } : {}) });
export let lastGraphDetail = "";
// Microsoft answers errors as {"error":{"code":"Forbidden",...}} (the token endpoint as {"error":"invalid_client",...}).
async function errorCode(res: Response, keepMessage = false): Promise<string | undefined> {
  const body = (await res.json().catch(() => null)) as { error?: unknown } | null;
  const e = body?.error ?? body; // Supabase answers {"code":"42703",...} without an error wrapper
  const code = typeof e === "string" ? e : (e as { code?: unknown } | null | undefined)?.code;
  // Graph's text for a rejected id or request names no message content; kept only for the messages call, short.
  const text = (e as { message?: unknown } | null | undefined)?.message;
  if (keepMessage && typeof text === "string") lastGraphDetail = text.slice(0, 200);
  return typeof code === "string" && /^\w{1,60}$/.test(code) ? code : undefined;
}

// Graph documents channel ids with their ":" and "@" as they are; the encoded forms are not accepted everywhere.
// People paste the id as copied from a Teams link, still percent-encoded; a team id may carry "&tenantId=..." after it.
const decoded = (id: string) => { try { return decodeURIComponent(id); } catch { return id; } };
const graphId = (id: string) => encodeURIComponent(decoded(id.trim())).replace(/%3A/gi, ":").replace(/%40/g, "@");

export const graphMessagesUrl = (teamId: string, channelId: string) => `https://graph.microsoft.com/v1.0/teams/${teamId.match(/[0-9a-f]{8}-[0-9a-f-]{27}/i)?.[0] ?? teamId.trim()}/channels/${graphId(channelId)}/messages?$top=50`;

export function teamsChannels(raw = process.env.TEAMS_CHANNELS): TeamsChannels {
  if (!raw) return {};
  try {
    // Pasting into a settings box often adds curly quotes or wrapping quotes; accept those.
    const parsed = JSON.parse(raw.trim().replace(/[\u201c\u201d]/g, '"').replace(/^'([\s\S]*)'$/, "$1"));
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return parsed;
  } catch {}
  throw Object.assign(new Error("TEAMS_CHANNELS must be a JSON object of project slug to {channel, webhook}"), { name: "TeamsChannelsJsonError" });
}

export function fakeTeamsPoster(): TeamsPoster & { posted: TeamsPost[] } {
  const posted: TeamsPost[] = [];
  return {
    posted,
    async post(p) {
      if (!p.projectSlug.trim()) throw new Error("A Teams post needs a project");
      if (!p.text.trim()) throw new Error("A Teams post needs text");
      posted.push(p);
    },
  };
}

export function webhookTeamsPoster(channels: TeamsChannels, fetchFn: typeof fetch = fetch): TeamsPoster {
  return {
    async post(p) {
      if (!p.projectSlug.trim()) throw new Error("A Teams post needs a project");
      if (!p.text.trim()) throw new Error("A Teams post needs text");
      const url = channels[p.projectSlug]?.webhook;
      if (!url) return; // this project has no Teams channel to post to
      const card = { type: "AdaptiveCard", version: "1.4", body: [{ type: "TextBlock", text: p.text, wrap: true }] };
      const res = await fetchFn(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ type: "message", attachments: [{ contentType: "application/vnd.microsoft.card.adaptive", content: card }] }),
      });
      if (!res.ok) throw httpError("TeamsWebhookError", `Teams webhook failed: ${res.status}`, res.status);
    },
  };
}

// Chooses the poster from TEAMS_PROVIDER. "fake" is the default.
export function teamsPoster(): TeamsPoster {
  const provider = process.env.TEAMS_PROVIDER ?? "fake";
  if (provider !== "fake" && provider !== "live") throw new Error("TEAMS_PROVIDER must be fake or live");
  return provider === "live" ? webhookTeamsPoster(teamsChannels()) : fakeTeamsPoster();
}

type GraphMessage = {
  id: string;
  messageType?: string;
  createdDateTime?: string;
  deletedDateTime?: string | null;
  subject?: string | null;
  body?: { contentType?: string; content?: string };
  from?: { user?: { id: string; displayName?: string } | null } | null;
};

const ENTITIES: Record<string, string> = { "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&#39;": "'", "&nbsp;": " " };
export function plainText(body: GraphMessage["body"]): string {
  const raw = body?.content ?? "";
  if (body?.contentType !== "html") return raw.trim();
  return raw.replace(/<(br|\/p|\/div)\s*\/?>/gi, "\n").replace(/<[^>]+>/g, "").replace(/&(amp|lt|gt|quot|nbsp|#39);/g, (m) => ENTITIES[m]).trim();
}

// Typed posts by a person only: system events, deleted messages, and posts by apps (including our own webhook, so nothing echoes back) are skipped.
export function personMessages(messages: GraphMessage[]) {
  return messages
    .filter((m) => m.messageType === "message" && !m.deletedDateTime && m.from?.user)
    .map((m) => ({ externalId: `teams:${m.id}`, fromName: m.from!.user!.displayName ?? null, fromId: m.from!.user!.id, subject: m.subject ?? "", bodyText: plainText(m.body), sentAt: m.createdDateTime ?? null }))
    .filter((m) => m.bodyText);
}

export type TeamsReaderEnv = { teamId?: string; tenantId: string; clientId: string; clientSecret: string; supabaseUrl: string; serviceRoleKey: string; channels: TeamsChannels };

// Reads the latest 50 messages of each mapped channel and stores the new ones (storing is idempotent). Replies to a thread are not read.
// Returns how many messages were stored or already stored. One channel failing does not stop the others.
export async function readTeamsChannels(env: TeamsReaderEnv, fetchFn: typeof fetch = fetch, onError: (e: unknown) => void = () => {}): Promise<number> {
  const slugs = Object.keys(env.channels);
  if (slugs.length === 0) return 0;
  const tokenRes = await fetchFn(`https://login.microsoftonline.com/${env.tenantId}/oauth2/v2.0/token`, {
    method: "POST",
    body: new URLSearchParams({ client_id: env.clientId, client_secret: env.clientSecret, scope: "https://graph.microsoft.com/.default", grant_type: "client_credentials" }),
  });
  if (!tokenRes.ok) throw httpError("GraphTokenError", `Graph sign-in failed: ${tokenRes.status}`, tokenRes.status, await errorCode(tokenRes));
  const { access_token } = (await tokenRes.json()) as { access_token: string };
  let seen = 0;
  for (const slug of slugs) {
    try {
      const res = await fetchFn(graphMessagesUrl(String(env.channels[slug].team ?? env.teamId), env.channels[slug].channel), { headers: { authorization: `Bearer ${access_token}` } });
      if (!res.ok) throw httpError("GraphMessagesError", `Graph read of ${slug} failed: ${res.status}`, res.status, await errorCode(res, true));
      for (const m of personMessages(((await res.json()) as { value: GraphMessage[] }).value)) {
        const store = await fetchFn(`${env.supabaseUrl}/rest/v1/rpc/ingest_teams`, {
          method: "POST",
          headers: { apikey: env.serviceRoleKey, authorization: `Bearer ${env.serviceRoleKey}`, "content-type": "application/json" },
          body: JSON.stringify({ p_slug: slug, p_external_id: m.externalId, p_from_name: m.fromName, p_from_id: m.fromId, p_subject: m.subject, p_body_text: m.bodyText, p_sent_at: m.sentAt }),
        });
        if (!store.ok) throw httpError("IngestTeamsError", `ingest_teams failed: ${store.status}`, store.status, await errorCode(store));
        if ((await store.json()) !== null) seen++; // null: no open project has that slug
      }
    } catch (e) {
      onError(e);
    }
  }
  return seen;
}

// Channels linked in project settings, by project slug. Archived projects are left out.
async function linkedChannels(url: string, key: string, fetchFn: typeof fetch): Promise<TeamsChannels> {
  const res = await fetchFn(`${url}/rest/v1/projects?select=email_slug,teams_team_id,teams_channel_id&teams_channel_id=not.is.null&archived_at=is.null`, { headers: { apikey: key, authorization: `Bearer ${key}` } });
  if (!res.ok) throw httpError("LinkedChannelsError", `reading linked channels failed: ${res.status}`, res.status, await errorCode(res));
  const rows = (await res.json()) as { email_slug: string; teams_team_id: string | null; teams_channel_id: string }[];
  return Object.fromEntries(rows.map((r) => [r.email_slug, { channel: r.teams_channel_id, ...(r.teams_team_id ? { team: r.teams_team_id } : {}) }]));
}

// The reader for the jobs endpoint, or undefined while Teams is not live. A channel linked in settings wins over TEAMS_CHANNELS.
export function teamsReaderFromEnv(env: Record<string, string | undefined> = process.env, fetchFn: typeof fetch = fetch): (() => Promise<number>) | undefined {
  if (env.TEAMS_PROVIDER !== "live") return undefined;
  const e = {
    tenantId: env.AUTH_MICROSOFT_ENTRA_ID_TENANT_ID, clientId: env.AUTH_MICROSOFT_ENTRA_ID_ID,
    clientSecret: env.AUTH_MICROSOFT_ENTRA_ID_SECRET, supabaseUrl: env.SUPABASE_URL, serviceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY,
  };
  if (!Object.values(e).every(Boolean)) return undefined;
  return async () => {
    const onError = (err: unknown) => {
      logError("teams read failed", err);
      if (lastGraphDetail) logEvent("teams_graph_detail", { detail: lastGraphDetail });
    };
    // Before the settings column exists the lookup fails; the env map still works.
    const linked = await linkedChannels(e.supabaseUrl!, e.serviceRoleKey!, fetchFn).catch((err) => (onError(err), {}));
    return readTeamsChannels({ ...(e as Omit<TeamsReaderEnv, "channels" | "teamId">), teamId: env.TEAMS_TEAM_ID, channels: { ...teamsChannels(env.TEAMS_CHANNELS), ...linked } }, fetchFn, onError);
  };
}
