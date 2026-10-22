// Messages open the timeline; tasks and decisions open the items page.
export const searchHref = (projectId: string, kind: string = "task"): string =>
  `/app/${kind === "message" ? "timeline" : "items"}?project=${projectId}`;

// The database marks matches with control characters (STX before, ETX after); plain text stays safe to render.
export type SnippetPart = { text: string; match: boolean };
export const snippetParts = (s: string): SnippetPart[] =>
  s.split("\u0002").flatMap((chunk, i) => {
    const [hit, rest] = i === 0 ? [null, chunk] : chunk.split("\u0003");
    return [...(hit !== null ? [{ text: hit, match: true }] : []), ...(rest ? [{ text: rest, match: false }] : [])];
  });
