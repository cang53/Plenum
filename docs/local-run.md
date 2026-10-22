# Run Plenum locally

About 10 minutes. Needs Node 20+, Docker and the [Supabase CLI](https://supabase.com/docs/guides/local-development). No cloud accounts: email and AI use local fakes.

## 1. Start the database
```
npm install
supabase start                # applies supabase/migrations
supabase status -o env        # shows API_URL, ANON_KEY, SERVICE_ROLE_KEY
```

## 2. Set `.env.local`
Copy `.env.example` to `.env.local` and replace the Supabase values with the local ones:
```
SUPABASE_URL=<API_URL>
NEXT_PUBLIC_SUPABASE_URL=<API_URL>
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<ANON_KEY>
SUPABASE_SERVICE_ROLE_KEY=<SERVICE_ROLE_KEY>
AUTH_PROVIDER=supabase
EMAIL_PROVIDER=fake
```
Leave `BEDROCK_MODEL_ID` empty; triage uses the offline rules.

## 3. Seed and run
```
npm run seed -- you@example.test    # person, workspace, demo project with plan and emails
npm run dev                         # http://localhost:3000
```

## Demo script
1. Open `/login`, enter the seeded email. The sign-in email appears in the local mail catcher at http://127.0.0.1:54324; click its link.
2. `/app` shows the demo project. Open **Timeline** and **Board** to see the plan (one task is blocked).
3. Use the seeded demo emails, or add one: `curl -X POST localhost:3000/api/dev/inbound -H 'content-type: application/json' -d '{"slug":"<project email slug>","from":"a@b.test","subject":"Delay","body":"Gearbox is late by a week"}'`.
4. Review the AI suggestion: edit if needed, accept, and follow the link back to the source message.
5. The new task is on the board. Move it to another status, then open **Audit** to see the change recorded.
6. **Members**: invite a colleague; the invitation lands in the outbox table (nothing is sent).

## Checks
`npm run lint`, `npm test`, `npm run test:db` (row-level security), `npm run test:e2e` (see [e2e.md](e2e.md)).

## Troubleshooting
- Port in use or containers stuck: `supabase stop`, then `supabase start`.
- Start over with an empty database: `supabase db reset`, then seed again.
- Sign-in link never arrives: check http://127.0.0.1:54324, not your real inbox.
