# Deploy to Vercel

`vercel.json` pins the Next.js build and the Dublin region (`dub1`). Security headers come from `next.config.ts`. No CSP yet: it needs per-request nonces, so it is queued.

## Connect (the only account step)
1. In Vercel, import `cang53/Plenum`. Region and build settings are read from `vercel.json`.
2. Add the variables below under Settings, Environment Variables (Production and Preview). Mark secrets as Sensitive.
3. Deploy, then confirm `GET <site>/api/health` returns 200 `{ok:true}`. Set it as the deploy check (Settings, Deployment Checks, or any uptime monitor): it returns only up or down.
4. Point a daily scheduler at `POST <site>/api/digest` with `Authorization: Bearer $DIGEST_SECRET` (Vercel Cron only sends GET, so use GitHub Actions schedule or another scheduler).

CI runs `npm run check:switches` on every pull request, so a misconfigured default fails before deploy. Run it locally with the production values before flipping a switch (see `account-ready.md`).

## Variables
| Name | Secret | Needed | Notes |
|---|---|---|---|
| `SUPABASE_URL` | no | always | Project `uwimagjkbwourvepvtns` (EU West, Ireland) |
| `NEXT_PUBLIC_SUPABASE_URL` | no | always | Same value; sent to the browser |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | no | always | Safe in the browser; row-level security limits access |
| `SUPABASE_SERVICE_ROLE_KEY` | **yes** | always | Server only. Never prefix with `NEXT_PUBLIC_` |
| `INBOUND_EMAIL_DOMAIN` | no | always | Project address domain, see `inbound-email.md` |
| `SES_INBOUND_TOPIC_ARN` | no | always | SNS topic allowed to post inbound mail |
| `AWS_REGION` | no | always | Must be an EU region (e.g. `eu-west-1`) |
| `APP_URL` | no | always | Public site URL, used in email links |
| `DIGEST_SECRET` | **yes** | for the digest | Without it `/api/digest` returns 403 |
| `AUTH_PROVIDER` | no | optional | `supabase` (default) or `entra` |
| `EMAIL_PROVIDER` | no | optional | `fake` (default) or `ses`; `ses` also needs `SES_FROM_ADDRESS`, `AWS_REGION` (EU) and AWS keys |
| `AI_PROVIDER` | no | optional | `rules` (default) or `bedrock` |
| `SES_FROM_ADDRESS` | no | if `ses` | Verified sender |
| `BEDROCK_MODEL_ID`, `BEDROCK_REGION` | no | if `bedrock` | EU profile id and EU region |
| `AI_DAILY_CALL_CAP` | no | no | model calls per workspace per day (default 200); over it, rules answer |
| `AUTH_SECRET` | **yes** | if `entra` | Auth.js session secret |
| `AUTH_MICROSOFT_ENTRA_ID_ID`, `_SECRET`, `_TENANT_ID` | `_SECRET` yes | if `entra` | From the Entra app registration |

AWS credentials for SES and Bedrock use the platform's standard `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` (secret) once those providers go live.
