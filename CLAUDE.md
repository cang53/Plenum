# Working rules for Claude

- Stack: Next.js (App Router) + TypeScript, Supabase Postgres, Auth.js, AWS SES and Bedrock (EU regions).
- One pull request per backlog row; keep each under about 400 changed lines.
- Every pull request: tests for new logic, `npm run lint` and `npm test` pass, a short description of what changed and how to try it.
- Trust rules are requirements: read only project-addressed messages; no per-person analytics; every AI change needs a human click and links to its source message.
- Never commit secrets; use `.env.local` and the hosting providers' secret settings.
- Access checks live in the database (row-level security) and are tested.
- Interface copy is plain English and ready for translation (no hard-coded strings in components).
