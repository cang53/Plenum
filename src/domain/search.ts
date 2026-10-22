// Messages open the timeline; tasks and decisions open the items page.
export const searchHref = (projectId: string, kind: string = "task"): string =>
  `/app/${kind === "message" ? "timeline" : "items"}?project=${projectId}`;

// Strips the markers the database puts around matches, keeping the text plain.
export const plainSnippet = (s: string): string => s.replace(/<\/?b>/g, "");
