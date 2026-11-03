import { describe, expect, it, vi } from "vitest";
import { agentRespond, type AgentIo } from "./agent-run";
import { agentRuleAsk, parseDate } from "./agent-fake";
import { isAgentTagged, parseAgentAnswer } from "@/domain/agent";

const tasks = [{ id: "t1", title: "Pour slab", startDate: "2026-11-02", dueDate: "2026-11-06", status: "todo" }];
const input = { today: "2026-11-03", message: "@agent please read the notes", documents: "[Attachment notes.docx]\nAttendees: Ana, Bo\nAction: Order rebar by 12 Nov\nMove pour slab to 13 November\nLunch is on Friday." };

function io(over: Partial<AgentIo> = {}): AgentIo & { reply: ReturnType<typeof vi.fn>; propose: ReturnType<typeof vi.fn> } {
  return { tasks: async () => tasks, history: async () => [], takeCall: async () => true, reply: vi.fn().mockResolvedValue(undefined), propose: vi.fn().mockResolvedValue(undefined), ...over } as never;
}

describe("agent rules", () => {
  it("reads action lines and moves, keeping the task's length", async () => {
    const fake = io();
    const out = await agentRespond(input, fake, agentRuleAsk);
    expect(out.actions).toEqual([
      { kind: "create_task", taskId: null, title: "Order rebar", details: "", startDate: "2026-11-12", dueDate: "2026-11-12", reason: 'The note says "Action: Order rebar by 12 Nov".' },
      { kind: "update_task", taskId: "t1", title: "Pour slab", details: "New finish date 2026-11-13.", startDate: "2026-11-09", dueDate: "2026-11-13", reason: 'The note says "Move pour slab to 13 November".' },
    ]);
    expect(fake.reply).toHaveBeenCalledWith(expect.stringContaining("2 changes"));
    expect(fake.propose).toHaveBeenCalledWith(out.actions);
  });

  it("answers without proposals when the note has nothing to change", async () => {
    const fake = io();
    await agentRespond({ ...input, documents: "Nothing here." }, fake, agentRuleAsk);
    expect(fake.propose).not.toHaveBeenCalled();
  });

  it("parses dates as written, rolling a past day to next year", () => {
    expect(parseDate("12 Nov", "2026-11-03")).toBe("2026-11-12");
    expect(parseDate("Nov 1", "2026-11-03")).toBe("2027-11-01");
    expect(parseDate("2026-12-31", "2026-11-03")).toBe("2026-12-31");
    expect(parseDate("31 Foo", "2026-11-03")).toBeNull();
  });
});

describe("agentRespond with a model", () => {
  it("keeps only well-formed proposals about real tasks", async () => {
    const model = JSON.stringify({ reply: "Done reading.", actions: [
      { kind: "update_task", task_id: "t1", title: "Pour slab", start_date: "2026-11-09", due_date: "2026-11-13", reason: "Note" },
      { kind: "update_task", task_id: "nope", title: "Ghost", due_date: "2026-11-13", reason: "Note" },
      { kind: "create_task", title: "No reason", due_date: "2026-11-13" },
      { kind: "delete_everything", title: "x", reason: "x" },
    ] });
    const fake = io();
    const out = await agentRespond(input, fake, async () => model);
    expect(out.actions.map((a) => a.title)).toEqual(["Pour slab"]);
    expect(fake.reply).toHaveBeenCalledWith("Done reading.");
  });

  it("falls back to the rules when the model fails or the cap is used up", async () => {
    const failing = io();
    expect((await agentRespond(input, failing, async () => { throw new Error("down"); })).actions).toHaveLength(2);
    const capped = io({ takeCall: async () => false });
    const ask = vi.fn();
    expect((await agentRespond(input, capped, ask)).actions).toHaveLength(2);
    expect(ask).not.toHaveBeenCalled();
  });
});

describe("tags and answers", () => {
  it("sees a tag only as its own word", () => {
    expect(isAgentTagged("hi @agent, notes attached")).toBe(true);
    expect(isAgentTagged("@Plenum what is late?")).toBe(true);
    expect(isAgentTagged("mail me@agentless.example")).toBe(false);
  });
  it("keeps the task's length whatever dates the model sends", () => {
    const ans = (a: object) => JSON.stringify({ reply: "ok", actions: [{ kind: "update_task", task_id: "t1", title: "Pour slab", reason: "note", ...a }] });
    expect(parseAgentAnswer(ans({ due_date: "2026-11-13", start_date: "2026-11-13" }), tasks)?.actions[0]).toMatchObject({ startDate: "2026-11-09", dueDate: "2026-11-13" });
    expect(parseAgentAnswer(ans({ start_date: "2026-11-09" }), tasks)?.actions[0]).toMatchObject({ startDate: "2026-11-09", dueDate: "2026-11-13" });
  });
  it("rejects an answer that is not JSON", () => {
    expect(parseAgentAnswer("sorry", tasks)).toBeNull();
  });
});
