import { describe, expect, it, vi } from "vitest";
import { draftTimesheet } from "./timesheetDraft";
import { parseTimesheetDraft, rulesDraft, type Activity } from "@/domain/timesheetDraft";
import { ruleBasedAsk } from "./triage-fake";

const act = (id: string, date: string): Activity => ({ task_id: id, title: id, source_message_id: null, active_on: date });
const two = [act("a", "2026-11-02"), act("b", "2026-11-02"), act("c", "2026-11-03")];
const yes = async () => true;

describe("rulesDraft", () => {
  it("splits 8 hours over the tasks of a day", () => {
    expect(rulesDraft(two)).toEqual([
      { taskId: "a", date: "2026-11-02", hours: 4 },
      { taskId: "b", date: "2026-11-02", hours: 4 },
      { taskId: "c", date: "2026-11-03", hours: 8 },
    ]);
  });
});

describe("parseTimesheetDraft", () => {
  it("keeps only known lines within 8 hours, once each", () => {
    const answer = '{"lines":[{"task":"a","date":"2026-11-02","hours":2.3},{"task":"a","date":"2026-11-02","hours":3},{"task":"x","date":"2026-11-02","hours":1},{"task":"b","date":"2026-11-02","hours":9}]}';
    expect(parseTimesheetDraft(answer, two)).toEqual([{ taskId: "a", date: "2026-11-02", hours: 2.25 }]);
  });
  it("returns null for bad answers", () => {
    expect(parseTimesheetDraft("nope", two)).toBeNull();
    expect(parseTimesheetDraft('{"lines":[]}', two)).toBeNull();
  });
});

describe("draftTimesheet", () => {
  it("uses the model answer", async () => {
    const ask = vi.fn().mockResolvedValue('{"lines":[{"task":"c","date":"2026-11-03","hours":5}]}');
    expect(await draftTimesheet("p", two, yes, ask)).toEqual([{ taskId: "c", date: "2026-11-03", hours: 5 }]);
  });
  it("uses the rules with the rules fallback, without spending a call", async () => {
    const takeCall = vi.fn();
    expect(await draftTimesheet("p", two, takeCall, ruleBasedAsk)).toEqual(rulesDraft(two));
    expect(takeCall).not.toHaveBeenCalled();
  });
  it("uses the rules when the cap is used, the model fails or answers badly", async () => {
    const ask = vi.fn().mockResolvedValue("{}");
    expect(await draftTimesheet("p", two, async () => false, ask)).toEqual(rulesDraft(two));
    expect(ask).not.toHaveBeenCalled();
    expect(await draftTimesheet("p", two, yes, vi.fn().mockRejectedValue(new Error("down")))).toEqual(rulesDraft(two));
    expect(await draftTimesheet("p", two, yes, ask)).toEqual(rulesDraft(two));
  });
  it("drafts nothing without activity", async () => {
    expect(await draftTimesheet("p", [], yes, ruleBasedAsk)).toEqual([]);
  });
});
