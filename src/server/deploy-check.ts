// Deploy readiness: the always-needed variables from docs/deploy.md, checked before a deploy. No imports,
// so `npm run deploy:check` can run this file directly.
type Env = Record<string, string | undefined>;

const URLS = ["SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_URL", "APP_URL"];
const PLAIN = ["NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "SUPABASE_SERVICE_ROLE_KEY", "INBOUND_EMAIL_DOMAIN", "SES_INBOUND_TOPIC_ARN", "AWS_REGION", "JOBS_SECRET"];

export function checkDeployEnv(env: Env = process.env): string[] {
  const problems = [...URLS, ...PLAIN].filter((n) => !env[n]).map((n) => `${n} is not set`);
  for (const n of URLS) {
    if (env[n] && !/^https:\/\/[^/\s]+/.test(env[n]!)) problems.push(`${n} must be an https URL`);
  }
  if (env.AWS_REGION && !/^eu-/.test(env.AWS_REGION)) problems.push(`AWS_REGION ${env.AWS_REGION} is outside the EU`);
  if (env.NEXT_PUBLIC_SUPABASE_URL && env.SUPABASE_URL && env.NEXT_PUBLIC_SUPABASE_URL !== env.SUPABASE_URL) problems.push("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_URL differ");
  return problems;
}
