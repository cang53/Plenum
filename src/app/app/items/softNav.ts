// Opening and closing the inspector only changes the address; the list underneath is already on the page.
export const INSPECTOR_KEYS = ["create", "edit", "detail", "task", "from", "title", "details", "saved"] as const;

export function softGo(href: string): void {
  history.pushState(null, "", href);
}

// The address without the inspector's own parameters: what "close" returns to.
export function listHref(url: URL): string {
  const p = new URLSearchParams(url.search);
  for (const k of INSPECTOR_KEYS) p.delete(k);
  return `${url.pathname}${p.size ? `?${p}` : ""}`;
}
