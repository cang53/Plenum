import type { MessageKey } from "@/lib/messages";

// Every string the studio shows on the client, resolved on the server so the component stays free of hard-coded text.
export const STUDIO_KEYS = [
  "ps.title", "ps.mode.ai", "ps.mode.manual", "ps.timeline", "ps.timelineHint", "ps.start", "ps.add", "ps.addNone", "ps.added", "ps.steps", "ps.stepsEmpty", "ps.people", "ps.peopleHint",
  "ps.existing", "ps.new", "ps.noOwner", "ps.gap", "ps.gapAi", "ps.gapManual", "ps.nearlyFull", "ps.weeks", "ps.weekShort", "ps.free", "ps.agent", "ps.agentHint",
  "ps.say", "ps.send", "ps.hello", "ps.chip.propose", "ps.chip.move", "ps.chip.assign", "ps.chip.shorter", "ps.chip.add", "ps.chip.remove", "ps.lessons", "ps.error", "ps.riskDate", "ps.affected", "ps.earlier", "ps.later", "ps.today",
  "ps.manual.title", "ps.manual.hint", "ps.manual.help", "ps.manual.turn", "ps.manual.sample", "ps.q.title", "ps.q.ask", "ps.q.suggest", "ps.q.none", "ps.q.later", "ps.q.done",
  "risks.role.project_manager", "risks.role.member", "risks.role.contributor",
] as const satisfies readonly MessageKey[];
