// One turn of the project agent: read the tagged message (and any attached notes), answer in the stream, and store proposals.
// Never changes a task: a person accepts each proposal. Offline rules answer when Bedrock is off, over its cap, down or malformed.
import { logError } from "@/lib/log";
import { AGENT_SYSTEM_PROMPT, buildAgentPrompt, parseAgentAnswer, type AgentAction, type AgentAnswer, type TaskRef } from "@/domain/agent";
import { agentRuleAsk } from "./agent-fake";
import type { Ask } from "./triage";

export type AgentIo = {
  tasks: () => Promise<TaskRef[]>;
  history: () => Promise<string[]>;
  takeCall: () => Promise<boolean>; // false when today's model calls are used up
  reply: (body: string) => Promise<void>;
  propose: (actions: AgentAction[]) => Promise<void>;
};

const AGENT_TOKENS = 2000;

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
  const reply = out.reply || (out.actions.length ? `I found ${out.actions.length} change(s) to the plan. Review them below.` : "I have nothing to change.");
  await io.reply(reply);
  if (out.actions.length) await io.propose(out.actions);
  return { reply, actions: out.actions };
}
