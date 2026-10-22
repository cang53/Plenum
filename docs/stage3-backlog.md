# Stage 3 backlog: a usable tool without new accounts

Goal: someone can sign in, see their project, triage messages and manage tasks end to end, using only Supabase. Email and AI sit behind adapters with local fakes, so Entra ID, SES and Bedrock plug in later without rewrites. One PR per row, about 400 lines or fewer.

| # | Task | Done when |
|---|------|-----------|
| S3-1 | Sign-in behind a provider switch: Supabase email magic link now, `AUTH_PROVIDER=entra` slot later | `/login` sends a link, `/app` needs a session, sign-out works |
| S3-2 | Data layer: Supabase client helpers and generated types; project switcher for the signed-in person | `/app` lists their projects, only their own (row-level security) |
| S3-3 | Real timeline and board on live data, replacing `/demo` | Status changes on the board are saved and audited |
| S3-4 | Email adapter with a local fake (outbox table or file); inbound dev endpoint to paste a message | Sends and receives work locally with no SES |
| S3-5 | AI adapter with a local rule-based fake; suggestions saved per message | Triage runs offline and writes `suggestions` |
| S3-6 | Suggestion review: accept, edit or dismiss with source message link | Accepting creates the item with `source_message_id` |
| S3-7 | Task, decision and risk create and edit screens; audit log view and CSV download | PM can manage items by hand |
| S3-8 | Invite people and roles by email (uses the email adapter) | Role changes obey row-level security tests |
| S3-9 | End-to-end tests (Playwright) of the core flow: sign in, message, suggestion, accept, board | CI runs them against local Supabase |
| S3-10 | Polish: loading, empty and error states, keyboard and screen-reader pass, mobile layout | No hard-coded strings, axe checks pass |
| S3-11 | Local-run guide: Supabase CLI stack, seed, `.env.local`, demo script | A new developer is running in 10 minutes |

Blocked on accounts and deliberately not here: Entra ID (3), live SES, Bedrock (12-14).
