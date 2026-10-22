// No inbox page exists yet, so every kind of hit leads to the items page.
export const searchHref = (projectId: string): string => `/app/items?project=${projectId}`;

// Strips the markers the database puts around matches, keeping the text plain.
export const plainSnippet = (s: string): string => s.replace(/<\/?b>/g, "");
