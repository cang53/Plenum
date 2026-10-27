import { describe, expect, it } from "vitest";
import { checkSwitches } from "@/server/switches";

const problems = (env: Record<string, string>) => checkSwitches(env).flatMap((s) => s.problems);

describe("checkSwitches", () => {
  it("is all off and clean by default", () => {
    expect(checkSwitches({}).map((s) => s.live)).toEqual([false, false, false, false]);
    expect(problems({})).toEqual([]);
  });

  it("lists what Entra ID still needs", () => {
    expect(problems({ AUTH_PROVIDER: "entra" })).toHaveLength(4);
    expect(problems({ AUTH_PROVIDER: "entra", AUTH_SECRET: "a", AUTH_MICROSOFT_ENTRA_ID_ID: "b", AUTH_MICROSOFT_ENTRA_ID_SECRET: "c", AUTH_MICROSOFT_ENTRA_ID_TENANT_ID: "d" })).toEqual([]);
  });

  it("needs a sender address and an EU region for SES", () => {
    expect(problems({ EMAIL_PROVIDER: "ses", AWS_REGION: "us-east-1" })).toEqual(["SES_FROM_ADDRESS is not set", "region us-east-1 is outside the EU"]);
    expect(problems({ EMAIL_PROVIDER: "ses", AWS_REGION: "eu-west-1", SES_FROM_ADDRESS: "a@b.eu" })).toEqual([]);
  });

  it("needs a model id and an EU region for Bedrock", () => {
    expect(problems({ AI_PROVIDER: "bedrock", BEDROCK_REGION: "us-west-2" })).toEqual(["BEDROCK_MODEL_ID is not set", "region us-west-2 is outside the EU"]);
    expect(problems({ AI_PROVIDER: "bedrock", BEDROCK_MODEL_ID: "eu.x" })).toEqual([]);
  });

  it("lists what live Teams still needs", () => {
    expect(problems({ TEAMS_PROVIDER: "live" })).toHaveLength(3);
    expect(problems({ TEAMS_PROVIDER: "live", AUTH_MICROSOFT_ENTRA_ID_ID: "b", AUTH_MICROSOFT_ENTRA_ID_SECRET: "c", AUTH_MICROSOFT_ENTRA_ID_TENANT_ID: "d" })).toEqual([]);
  });

  it("flags a mistyped flag value", () => {
    expect(problems({ AI_PROVIDER: "bedrok" })).toEqual(["AI_PROVIDER=bedrok is not one of rules, bedrock"]);
  });
});
