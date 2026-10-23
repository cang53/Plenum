# Account-ready switches

Four flags decide what is live. Defaults are safe: nothing leaves the system. Set secrets in the host's secret settings (never in git), then run `npm run check:switches` with the same values; it lists anything missing and exits 1 on a problem.

| Switch | Flag | Off | On | Needs |
|---|---|---|---|---|
| Entra ID sign-in | `AUTH_PROVIDER` | `supabase` (email link) | `entra` | `AUTH_SECRET`, `AUTH_MICROSOFT_ENTRA_ID_ID`, `_SECRET`, `_TENANT_ID` |
| Live email | `EMAIL_PROVIDER` | `fake` (outbox table) | `ses` | `SES_FROM_ADDRESS`, `AWS_REGION` in the EU, SES domain verified and out of sandbox |
| AI triage | `AI_PROVIDER` | `rules` (no AI) | `bedrock` | `BEDROCK_MODEL_ID` (EU profile), `BEDROCK_REGION` in the EU, model access granted in Bedrock |
| Live Teams posts | `TEAMS_PROVIDER` | `fake` (kept in memory) | `live` | `TEAMS_TEAM_ID`, the Entra app variables above, admin consent for channel posting |

## Go-live order
1. **Bedrock**: request model access in an EU region, set the three variables, check, redeploy. Triage only suggests; a human still clicks.
2. **SES**: verify the sending domain (DKIM, SPF), leave the sandbox, set the variables. Inbound stays as in `inbound-email.md`.
3. **Entra ID**: register the app (redirect `<site>/auth/callback`), create a client secret, set the variables.

## Known gaps
The flags and checks exist; the provider code behind some of them does not yet. `TEAMS_PROVIDER=live` makes `teamsPoster()` throw until live Teams posting is built (stage 13 later). `EMAIL_PROVIDER=ses` makes `emailSender()` throw until the SES sender (stage 3 task 12) is added, and `AUTH_PROVIDER=entra` only changes the login page until the Auth.js Entra provider (stage 3 task 3) is wired. Bedrock is fully wired. Do not flip those two flags in production before that code lands.
