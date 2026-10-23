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

## Dry run (S13-6)
Run on main with no cloud accounts and no Docker (the local Supabase stack could not start here, so the database and sign-in steps are covered by `npm run test:db` and `npm run test:e2e` in CI). `npm run check:switches` passes with the defaults and fails with a list of missing variables for each flag set to its live value; `tsc`, lint and tests pass.

## Known gaps
Only `TEAMS_PROVIDER=live` is not built: `teamsPoster()` throws until live Teams posting exists (later, needs admin consent). SES sending, the Auth.js Entra provider and Bedrock are wired, but none has been run against a real account; the first live run is the real test, so flip one switch at a time in the order above.
