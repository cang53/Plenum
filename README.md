# Plenum

One project timeline for industrial teams: Teams messages and emails turn into tasks, decisions and reports, with people approving every AI suggestion.

## Run locally
See [docs/local-run.md](docs/local-run.md) for the full local setup (Supabase CLI, seed, demo script).

## Docs
- Database and migrations: [docs/database.md](docs/database.md)
- Product docs: see [docs/links.md](docs/links.md)

## AI accuracy
`npm run ai:eval` runs the 50-message test set (src/ai/testset.ts) against Bedrock and prints accuracy per kind. Needs `BEDROCK_MODEL_ID` and AWS credentials. The "AI accuracy" workflow runs it on every pull request touching AI code once the repository secrets `AWS_ROLE_ARN` and `BEDROCK_MODEL_ID` exist.
