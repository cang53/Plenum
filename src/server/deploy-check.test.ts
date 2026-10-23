import { describe, expect, it } from "vitest";
import { checkDeployEnv } from "./deploy-check";

const ok = {
  SUPABASE_URL: "https://x.supabase.co", NEXT_PUBLIC_SUPABASE_URL: "https://x.supabase.co", APP_URL: "https://plenum.example",
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "k", SUPABASE_SERVICE_ROLE_KEY: "s", INBOUND_EMAIL_DOMAIN: "in.example",
  SES_INBOUND_TOPIC_ARN: "arn", AWS_REGION: "eu-west-1", JOBS_SECRET: "j",
};

describe("checkDeployEnv", () => {
  it("passes a complete environment", () => expect(checkDeployEnv(ok)).toEqual([]));
  it("names every missing variable", () => expect(checkDeployEnv({})).toHaveLength(9));
  it("rejects http, non-EU and mismatched values", () => {
    const p = checkDeployEnv({ ...ok, APP_URL: "http://a.example", AWS_REGION: "us-east-1", NEXT_PUBLIC_SUPABASE_URL: "https://y.supabase.co" });
    expect(p).toEqual(["APP_URL must be an https URL", "AWS_REGION us-east-1 is outside the EU", "NEXT_PUBLIC_SUPABASE_URL and SUPABASE_URL differ"]);
  });
});
