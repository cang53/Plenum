// One turn of the project agent: read the tagged message (and any attached notes), answer in the stream, and store proposals.
// Never changes a task: a person accepts each proposal. Offline rules answer when Bedrock is off, over its cap, down or malformed.
import { logError } from "@/lib/log";
import { AGENT_SYSTEM_PROMPT, buildAgentPrompt, dependencyAction, parseAgentAnswer, type AgentAction, type AgentAnswer, type TaskRef } from "@/domain/agent";
import { findDependencies, matchTask } from "@/domain/agentDeps";
import { agentRuleAsk } from "./agent-fake";
import type { Ask } from "./triage";

export type AgentIo = {
  tasks: () => Promise<TaskRef[]>;
  history: () => Promise<string[]>;
  takeCall: () => Promise<boolean>; // false when today's model calls are used up
  reply: (body: string) => Promise<void>;
  propose: (actions: AgentAction[]) => Promise<void>;
};

const DAY = 86_400_000;
const AGENT_TOKENS = 2000;
const norm = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}]+/g, " ").trim();
const CLAIM = /\b(I'll|I will|I have|I've|I made|I updated|I added|I linked|done|updated|linked|added)\b/i;

export async function agentRespond(input: { message: string; documents: string; today: string }, io: AgentIo, ask: Ask): Promise<AgentAnswer> {
  const tasks = await io.tasks();
  const prompt = buildAgentPrompt({ ...input, tasks, history: await io.history() });
  const offline = async () => parseAgentAnswer(await agentRuleAsk(AGENT_SYSTEM_PROMPT, prompt), tasks) ?? { reply: "", actions: [] };
  let answer: AgentAnswer | null = null;
  if (ask !== agentRuleAsk && (await io.takeCall())) {
    try {
      answer = parseAgentAnswer(await ask(AGENT_SYSTEM_PROMPT, prompt, AGENT_TOKENS), tasks);
    } catch (error) {
      logError("Bedrock failed, agent using rules", error);
    }
  }
  const out = answer ?? (await offline());
  // A create_task for work an open task already covers (same title, ignoring case and punctuation) would make a duplicate, so it is dropped.
  const seen = new Set(tasks.map((t) => norm(t.title)));
  out.actions = out.actions.filter((a) => a.kind !== "create_task" || (!seen.has(norm(a.title)) && !!seen.add(norm(a.title))));
  // Dependencies are also read by code, so a model that missed one or made a new task for it is corrected.
  const deps = findDependencies(`${input.message}\n${input.documents}`, tasks);
  if (deps.found.length) {
    out.actions = out.actions.filter((a) => a.kind !== "create_task" || !matchTask(a.title, tasks));
    for (const d of deps.found) {
      if (out.actions.some((a) => a.kind === "add_dependency" && a.taskId === d.successorId && a.predecessorId === d.predecessorId)) continue;
      out.actions.push(dependencyAction(tasks.find((t) => t.id === d.predecessorId)!, tasks.find((t) => t.id === d.successorId)!, `The message says "${d.sentence}".`));
    }
  }
  // A link whose tasks already clash gets a second card that moves the waiting task to start the day after, keeping its length.
  for (const d of deps.found) {
    const pred = tasks.find((t) => t.id === d.predecessorId)!;
    const succ = tasks.find((t) => t.id === d.successorId)!;
    if (!pred.dueDate || !succ.startDate || succ.startDate > pred.dueDate || out.actions.some((a) => a.kind === "update_task" && a.taskId === succ.id)) continue;
    const start = new Date(Date.parse(pred.dueDate) + DAY).toISOString().slice(0, 10);
    const due = succ.dueDate ? new Date(Date.parse(succ.dueDate) + (Date.parse(start) - Date.parse(succ.startDate))).toISOString().slice(0, 10) : null;
    out.actions.push({ kind: "update_task", taskId: succ.id, title: succ.title, details: `Starts ${start} so it follows "${pred.title}".`, startDate: start, dueDate: due, reason: `"${succ.title}" starts before "${pred.title}" is due (${pred.dueDate}).` });
  }
  // Never say a change is made or coming when no card was proposed.
  if (!out.actions.length && (deps.unresolved.length || CLAIM.test(out.reply))) {
    out.reply = deps.unresolved.length ? "I could not match both tasks to your plan, so I proposed nothing. Use the task names as they appear in the task list." : "I did not propose any change, so nothing was updated.";
  }
  const reply = out.reply || (out.actions.length ? `I found ${out.actions.length} change(s) to the plan. Review the cards under your message.` : "I have nothing to change.");
  await io.reply(reply);
  if (out.actions.length) await io.propose(out.actions);
  return { reply, actions: out.actions };
}
