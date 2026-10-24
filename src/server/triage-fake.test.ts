import { describe, expect, it } from "vitest";
import { score } from "@/ai/accuracy";
import { TEST_SET, toMessage } from "@/ai/testset";
import { buildUserPrompt } from "@/domain/triage";
import { ruleBasedAsk } from "./triage-fake";
import { suggestFor } from "./triage";

describe("ruleBasedAsk", () => {
  it("turns a delay mail into a risk with the subject as title", async () => {
    const message = toMessage({ expected: "risk", subject: "Gearbox", body: "Delivery slips to 28 Nov. Sorry." }, 0);
    expect(await suggestFor(message, ruleBasedAsk)).toEqual({ kind: "risk", title: "Gearbox", details: "Delivery slips to 28 Nov.", reason: 'The message says "slips".' });
  });

  it("suggests nothing for small talk", async () => {
    expect(await ruleBasedAsk("", buildUserPrompt(toMessage({ expected: "none", subject: "Lunch", body: "Pizza on Friday." }, 0)))).toBe('{"kind":"none"}');
  });

  it("gets most of the test set right", async () => {
    const got = [];
    for (const [i, c] of TEST_SET.entries()) got.push(await suggestFor(toMessage(c, i), ruleBasedAsk));
    const report = score(TEST_SET.map((c) => c.expected), got);
    expect(report.correct / report.total).toBeGreaterThan(0.5);
  });
});
