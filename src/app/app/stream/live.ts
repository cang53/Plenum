// What the Stream listens to: every change to this project's messages and AI cards, plus attachments.
// Attachments carry no project id, so they are not filtered here; row-level security only sends the ones the person may see.
export function liveChannelSpec(projectId: string) {
  const filter = `project_id=eq.${projectId}`;
  const mine = (["messages", "agent_actions"] as const).map((table) => ({ event: "*" as const, schema: "public", table, filter }));
  return { name: `stream-${projectId}`, filters: [...mine, { event: "*" as const, schema: "public", table: "message_attachments" }] };
}
