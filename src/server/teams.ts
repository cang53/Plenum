// Teams posting behind one small interface, like email. Only the offline fake exists so far; it keeps
// posts in memory instead of sending. Live Teams (Graph, needs admin approval) comes later.
export type TeamsPost = { projectSlug: string; kind: "celebration" | "message"; text: string; inReplyTo?: string };

export type TeamsPoster = { post: (post: TeamsPost) => Promise<void> };

export function fakeTeamsPoster(): TeamsPoster & { posted: TeamsPost[] } {
  const posted: TeamsPost[] = [];
  return {
    posted,
    async post(p) {
      if (!p.projectSlug.trim()) throw new Error("A Teams post needs a project");
      if (!p.text.trim()) throw new Error("A Teams post needs text");
      posted.push(p);
    },
  };
}

// Chooses the poster from TEAMS_PROVIDER. "fake" is the default; "live" is not built yet.
export function teamsPoster(): TeamsPoster {
  const provider = process.env.TEAMS_PROVIDER ?? "fake";
  if (provider !== "fake" && provider !== "live") throw new Error("TEAMS_PROVIDER must be fake or live");
  if (provider === "live") throw new Error("Live Teams posting is not built yet");
  return fakeTeamsPoster();
}
