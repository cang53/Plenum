// Rewards are on unless the workspace turned them off everywhere (site "") or for this site.
export function rewardsOn(offSites: string[], site: string): boolean {
  return !offSites.includes("") && !offSites.includes(site.trim());
}

// The settings form: one site per line, plus an "everywhere" tick.
export function switchList(everywhere: boolean, lines: string): string[] {
  const sites = lines.split("\n").map((s) => s.trim()).filter(Boolean).slice(0, 100);
  return [...new Set(everywhere ? ["", ...sites] : sites)].filter((s) => s.length <= 80);
}
