// Runs the test set against the real model: npm run ai:eval (needs BEDROCK_MODEL_ID and AWS credentials).
// Prints the accuracy report and appends it to the GitHub job summary when there is one.

import { appendFileSync } from "node:fs";
import { it } from "vitest";
import { bedrockAsk, suggestFor } from "@/server/triage";
import { formatReport, score } from "./accuracy";
import { TEST_SET, toMessage } from "./testset";

it("reports triage accuracy", async () => {
  const ask = bedrockAsk();
  const got = [];
  for (const [i, c] of TEST_SET.entries()) got.push(await suggestFor(toMessage(c, i), ask));
  const text = formatReport(score(TEST_SET.map((c) => c.expected), got));
  console.log(text);
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${text}\n`);
}, 600_000);
