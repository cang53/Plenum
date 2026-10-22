// "Show more" link under a paged list; renders nothing on the last page.
export function MoreLink({ path, params, next, label }: { path: string; params: Record<string, string>; next: string | null; label: string }) {
  if (!next) return null;
  return <p><a href={`${path}?${new URLSearchParams({ ...params, after: next })}`}>{label}</a></p>;
}
