# Test Teams without your work tenant

Plenum reads Teams and posts to Teams only when `TEAMS_PROVIDER=live`. Off by default.

## What the code does

- **Read:** the hourly `/api/jobs` call runs a `teams-read` job. For each project mapped in `TEAMS_CHANNELS` it reads the latest 50 channel messages through Microsoft Graph (app permission `ChannelMessage.Read.All`) and stores new ones in the Stream with source "Teams". Posts by apps and bots, system events, deleted messages and thread replies are skipped.
- **Post:** a message written in the Stream is also posted to the project's channel through a Teams Workflows webhook (best effort; the message is saved even if Teams is down). Graph does not let an app post channel messages as itself, so a webhook is used. Webhook posts come from an app, so the reader skips them and nothing echoes back.
- Not built: reading replies inside a thread, live updates (it polls), per-person mapping.

## 1. Get a tenant (about 15 minutes)

1. **Microsoft 365 Developer Program sandbox** (free E5, 25 users, 90 days). Try [developer.microsoft.com/microsoft-365/dev-program](https://developer.microsoft.com/microsoft-365/dev-program). In 2026 it only goes to accounts with a qualifying Visual Studio subscription or partner membership, and personal accounts are often refused ([Microsoft Q&A reports](https://learn.microsoft.com/en-us/answers/questions/5915312/cannot-qualify-for-microsoft-365-developer-program)). If it says you do not qualify, skip it.
2. **Free trial (works for anyone):** start a one-month [Microsoft Teams Essentials or Microsoft 365 Business Basic trial](https://www.microsoft.com/en-gb/microsoft-teams/teams-trials). It needs a card; cancel before day 30 to avoid charges. Sign up with a new work-style address (for example `you@yourname.onmicrosoft.com`), not your employer's tenant. You become Global Admin of a new, separate tenant.
3. In the Microsoft 365 admin center (admin.microsoft.com) go to Users, Active users, Add a user. Create a second test user and assign the trial licence. You need two people so you can see a message from someone else.

## 2. Create a team and a project channel

1. Open teams.microsoft.com, sign in as the admin, Teams, Create team, From scratch, Private. Name it "Plenum test". Add the second user.
2. In the team, `...` next to the team, Add channel, name it after your Plenum project (for example "Line 4 retrofit").
3. Team ID: team `...`, Get link to team. In the link, copy the value after `groupId=` (a GUID). This is `TEAMS_TEAM_ID`.
4. Channel ID: channel `...`, Get link to channel. Copy the part between `/channel/` and the next `/`, URL-decoded; it looks like `19:abc123...@thread.tacv2`.
5. Webhook for posting: channel `...`, Workflows, choose "Post to a channel when a webhook request is received", finish the wizard and copy the URL.

## 3. Register the Entra app

In entra.microsoft.com (signed in to the test tenant): App registrations, New registration, name "Plenum test", single tenant. Skip the redirect URI (add `https://<your site>/api/auth/callback/microsoft-entra-id`, type Web, only if you also want to test Entra sign-in).

1. API permissions, Add a permission, Microsoft Graph, **Application permissions**, add `ChannelMessage.Read.All`. Then **Grant admin consent for <tenant>** and check the green tick.
2. Certificates & secrets, New client secret. Copy the **Value** now; it is shown once.
3. Overview page: copy Application (client) ID and Directory (tenant) ID.

If Graph answers 403 after consent, wait a few minutes; if it persists, Microsoft may require a protected API access request for message reading in your tenant ([reports](https://learn.microsoft.com/en-us/answers/questions/6049168/channelmessage-read-all-application-permission-ret)). I could not confirm this either way.

## 4. Link the channel and set Vercel variables

In Plenum, open the project's Settings, paste the channel link (Get link to channel) into **Teams channel** and save. That replaces `TEAMS_TEAM_ID` and `TEAMS_CHANNELS` (both still work as a fallback; the settings link wins). Run `db/apply-teams-channel.sql` first. Settings also shows the project slug and email address.

| Variable | Value |
|---|---|
| `TEAMS_PROVIDER` | `live` |
| `TEAMS_TEAM_ID` | Team ID from step 2.3 |
| `TEAMS_CHANNELS` | `{"<project email slug>":{"channel":"<channel id>","webhook":"<Workflows URL>"}}` |
| `AUTH_MICROSOFT_ENTRA_ID_ID` | Application (client) ID |
| `AUTH_MICROSOFT_ENTRA_ID_SECRET` | client secret Value |
| `AUTH_MICROSOFT_ENTRA_ID_TENANT_ID` | Directory (tenant) ID |

The project email slug is the part before `@` in the project's address (for example `line4-ghent`). These variables are already used by Entra sign-in; if you use a test tenant only for Teams, leave `AUTH_PROVIDER` as it is. `JOBS_SECRET`, `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` must also be set. Redeploy after changing variables.

## 5. Try it

1. Run `npm run check:switches`: it should list no problems for Teams.
2. Post in the Teams channel as the second user.
3. Run the job now instead of waiting: `curl -X POST -H "Authorization: Bearer $JOBS_SECRET" https://<site>/api/jobs`. The response should show `"teams-read":{"ran":true,"detail":"1 read"}`.
4. Open the Stream, filter by Teams: the message is there.
5. Write a message in the Stream: it appears in the channel.

Migrations `20261027000152` and `20261027000153` add the Teams source and the `ingest_teams` function; apply them first.
