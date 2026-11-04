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

describe("dependencies", () => {
  const deps = [{ id: "cab", title: "Install control cabinet", startDate: null, dueDate: null, status: "todo" }, { id: "conv", title: "Install conveyer modules", startDate: null, dueDate: null, status: "todo" }];
  const run = (message: string, ask: Parameters<typeof agentRespond>[2]) => {
    const fake = io({ tasks: async () => deps });
    return agentRespond({ today: "2026-11-04", message, documents: "" }, fake, ask).then((out) => ({ out, fake }));
  };
  const said = "@agent we cannot start installing the control cabinet until the convoyer modules are completely installed";
  const card = { kind: "add_dependency", taskId: "cab", predecessorId: "conv" };

  it("offline rules propose one dependency card", async () => {
    const { out } = await run(said, agentRuleAsk);
    expect(out.actions).toMatchObject([card]);
  });
  it("replaces a model's new task with the dependency card", async () => {
    const ask = async () => JSON.stringify({ reply: "Got it. I'll make sure it depends.", actions: [{ kind: "create_task", title: "Wait for conveyor modules", reason: "said so", due_date: "2026-11-10" }] });
    const { out } = await run(said, ask);
    expect(out.actions).toMatchObject([card]);
  });
  it("keeps the model's own dependency without doubling it", async () => {
    const ask = async () => JSON.stringify({ reply: "Linked.", actions: [{ kind: "add_dependency", task_id: "cab", predecessor_id: "conv", title: "x", reason: "said so" }] });
    expect((await run(said, ask)).out.actions).toHaveLength(1);
  });
  it("does not claim a change when nothing was proposed", async () => {
    const ask = async () => JSON.stringify({ reply: "I'll update the task.", actions: [] });
    const { out, fake } = await run("@agent the roof cannot start until the control cabinet is finished", ask);
    expect(out.actions).toEqual([]);
    expect(fake.reply).toHaveBeenCalledWith(expect.stringContaining("could not match"));
    expect((await run("@agent thanks", ask)).out.reply).toContain("did not propose");
  });
  it("drops model dependencies on unknown tasks", () => {
    const out = parseAgentAnswer(JSON.stringify({ reply: "ok", actions: [{ kind: "add_dependency", task_id: "cab", predecessor_id: "nope", title: "x", reason: "r" }, { kind: "add_dependency", task_id: "cab", predecessor_id: "cab", title: "x", reason: "r" }] }), deps);
    expect(out?.actions).toEqual([]);
  });
  it("also proposes moving the waiting task when the dates clash", async () => {
    const dated = [{ ...deps[0], startDate: "2027-01-04", dueDate: "2027-01-15" }, { ...deps[1], startDate: "2026-12-21", dueDate: "2027-01-15" }];
    const { out } = await run(said, agentRuleAsk).then(() => agentRespond({ today: "2026-11-04", message: said, documents: "" }, io({ tasks: async () => dated }), agentRuleAsk).then((o) => ({ out: o })));
    expect(out.actions).toMatchObject([card, { kind: "update_task", taskId: "cab", startDate: "2027-01-16", dueDate: "2027-01-27" }]);
  });
});
