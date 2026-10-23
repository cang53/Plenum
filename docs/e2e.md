# End-to-end tests

`e2e/flows.spec.ts` covers invite and role change, the daily digest preference, export and project delete. Both specs use role- and label-based selectors so markup changes do not break them.

`e2e/stage9.spec.ts` covers the stage 9 screens on a fresh project: daily site log, risks and issues, baselines on the Gantt, and document tags on an attachment.

`e2e/core-flow.spec.ts` drives the core flow in a browser: sign in with the emailed link, receive a message, accept the AI suggestion, see the task on the board and change its status. It uses the local Supabase stack, the offline email and AI fakes, and no cloud accounts.

Run it locally (needs Docker and the Supabase CLI):

```
supabase start                     # applies supabase/migrations
supabase status -o env             # copy API_URL, ANON_KEY, SERVICE_ROLE_KEY
```

Then set these in the shell, or in `.env.local` and run `node --env-file=.env.local node_modules/.bin/playwright test` (Playwright does not read `.env.local` by itself; `npm run test:e2e` needs them in the shell). If Chromium is installed elsewhere, set `PLAYWRIGHT_CHROMIUM_PATH`:

```
SUPABASE_URL=<API_URL>
NEXT_PUBLIC_SUPABASE_URL=<API_URL>
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<ANON_KEY>
SUPABASE_SERVICE_ROLE_KEY=<SERVICE_ROLE_KEY>
INBOUND_EMAIL_DOMAIN=in.plenum.example
SES_INBOUND_TOPIC_ARN=arn:aws:sns:eu-west-1:000000000000:plenum-inbound
AWS_REGION=eu-west-1
```

Sign-in emails are read from the local mail catcher at `http://127.0.0.1:54324` (override with `MAIL_API_URL`). Each run creates its own person and project, so runs do not clash. CI runs the same steps in the `e2e` job.
