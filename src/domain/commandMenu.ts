// Command menu: Cmd or Ctrl plus K opens it; actions are filtered by what is typed, hits come from search.
export type MenuAction = { id: "newTask" | "search"; label: string; href: string };

export const isMenuKey = (e: { key: string; ctrlKey: boolean; metaKey: boolean; altKey: boolean }): boolean =>
  e.key.toLowerCase() === "k" && (e.ctrlKey || e.metaKey) && !e.altKey;

export const matchActions = (actions: MenuAction[], q: string): MenuAction[] => {
  const needle = q.trim().toLowerCase();
  return needle ? actions.filter((a) => a.label.toLowerCase().includes(needle)) : actions;
};

// Arrow keys wrap around the list; an empty list has no active row.
export const stepActive = (at: number, step: number, count: number): number => (count === 0 ? -1 : (at + step + count) % count);
