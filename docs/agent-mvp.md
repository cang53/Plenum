# Agent MVP

In the project Stream, tag `@agent` (or `@plenum`) in a message, optionally with a meeting note (docx, PDF or text).
The agent answers in the stream and proposes changes: new tasks, or new dates for an existing task. Each proposal is a card
with Accept and Dismiss. Accept (project managers only) makes the change; the Gantt and board show it on the next load.
Ordinary chat messages still get the one-item AI suggestion card as before.

## Switch on the model
Offline by default (rules read lines like `Action: Order rebar by 12 Nov` and `Move pour slab to 13 Nov`). To use Bedrock set
`AI_PROVIDER=bedrock`, `BEDROCK_MODEL_ID` (an EU model or `eu.` profile) and `BEDROCK_REGION` (an `eu-` region) in the host's
environment settings. If a call fails, is over `AI_DAILY_CALL_CAP`, or the answer is malformed, the offline rules answer.
`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` must be set for the daily cap and for the chat suggestion card.

## Database
Apply `supabase/migrations/20261103000155_agent_actions.sql` once. Until then the stream works and the agent replies, but
proposals are not stored.
