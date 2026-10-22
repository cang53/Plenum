// Offline stand-in for the model: keyword rules, no network. Same shape as bedrockAsk, so
// swapping in Bedrock (backlog task 12) changes nothing else.
import type { Ask } from "./triage";

const RULES: [kind: string, pattern: RegExp][] = [
  ["change_request", /change request|change order|variation|scope|additional work|extra cost|wijziging|meerwerk|änderung|mehrkosten/],
  ["risk", /\b(risk|delay|delayed|slip|slips|late|shortage|concern|worried|might|may not|cannot|could fail|vertraging|risiko|verzögerung)\b/],
  ["decision", /decid|decision|approved|agreed|chose|chosen|awarded|beslist|besloten|entschieden|beschlossen/],
  ["task", /\b(please|can you|could you|need to|needs to|must|have to|kun je|bitte)\b/],
];

export const ruleBasedAsk: Ask = async (_system, user) => {
  const [header, ...rest] = user.split("\n\n");
  const subject = /^Subject: (.*)$/m.exec(header)?.[1]?.trim() ?? "";
  const body = rest.join("\n\n").trim();
  const text = `${subject}\n${body}`.toLowerCase();
  const hit = RULES.find(([, pattern]) => pattern.test(text));
  if (!hit || !subject) return '{"kind":"none"}';
  return JSON.stringify({ kind: hit[0], title: subject, details: body.split(/(?<=[.!?])\s/)[0] ?? "" });
};
