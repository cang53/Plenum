// What the Stream listens to: every change to this project's messages and AI cards.
export function liveChannelSpec(projectId: string) {
  const filter = `project_id=eq.${projectId}`;
  return {
    name: `stream-${projectId}`,
    filters: (["messages", "agent_actions"] as const).map((table) => ({ event: "*" as const, schema: "public", table, filter })),
  };
}
