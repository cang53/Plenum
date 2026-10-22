# Plenum

One project timeline for industrial teams: Teams messages and emails turn into tasks, decisions and reports, with people approving every AI suggestion.

## Run locally
1. Copy `.env.example` to `.env.local` and fill in the values.
2. `npm install`
3. `npm run dev`, then open http://localhost:3000

## Docs
- Database and migrations: [docs/database.md](docs/database.md)
- Product docs: see [docs/links.md](docs/links.md)

## AI accuracy
`npm run ai:eval` runs the 50-message test set (src/ai/testset.ts) against Bedrock and prints accuracy per kind. Needs `BEDROCK_MODEL_ID` and AWS credentials. The "AI accuracy" workflow runs it on every pull request touching AI code once the repository secrets `AWS_ROLE_ARN` and `BEDROCK_MODEL_ID` exist.
