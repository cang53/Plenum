// Account-ready switches: what each provider flag needs before it can be turned on. No imports, so
// `npm run check:switches` can run this file directly.
type Env = Record<string, string | undefined>;
export type Switch = { name: string; flag: string; value: string; live: boolean; problems: string[] };

const EU_REGION = /^eu-/;

function need(env: Env, names: string[]): string[] {
  return names.filter((n) => !env[n]).map((n) => `${n} is not set`);
}

export function checkSwitches(env: Env = process.env): Switch[] {
  const auth = env.AUTH_PROVIDER ?? "supabase";
  const email = env.EMAIL_PROVIDER ?? "fake";
  const ai = env.AI_PROVIDER ?? "rules";
  const aws = env.BEDROCK_REGION ?? env.AWS_REGION ?? "eu-west-1";
  const euProblem = EU_REGION.test(aws) ? [] : [`region ${aws} is outside the EU`];
  const unknown = (flag: string, value: string, ok: string[]) => (ok.includes(value) ? [] : [`${flag}=${value} is not one of ${ok.join(", ")}`]);
  return [
    {
      name: "Entra ID sign-in", flag: "AUTH_PROVIDER", value: auth, live: auth === "entra",
      problems: [...unknown("AUTH_PROVIDER", auth, ["supabase", "entra"]),
        ...(auth === "entra" ? need(env, ["AUTH_SECRET", "AUTH_MICROSOFT_ENTRA_ID_ID", "AUTH_MICROSOFT_ENTRA_ID_SECRET", "AUTH_MICROSOFT_ENTRA_ID_TENANT_ID"]) : [])],
    },
    {
      name: "Live SES email", flag: "EMAIL_PROVIDER", value: email, live: email === "ses",
      problems: [...unknown("EMAIL_PROVIDER", email, ["fake", "ses"]),
        ...(email === "ses" ? [...need(env, ["SES_FROM_ADDRESS", "AWS_REGION"]), ...euProblem] : [])],
    },
    {
      name: "Bedrock triage", flag: "AI_PROVIDER", value: ai, live: ai === "bedrock",
      problems: [...unknown("AI_PROVIDER", ai, ["rules", "bedrock"]),
        ...(ai === "bedrock" ? [...need(env, ["BEDROCK_MODEL_ID"]), ...euProblem] : [])],
    },
  ];
}
