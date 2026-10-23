import { describe, expect, it } from "vitest";
import { isMenuKey, matchActions, stepActive, type MenuAction } from "./commandMenu";

const key = (k: string, mods: Partial<{ ctrlKey: boolean; metaKey: boolean; altKey: boolean }> = {}) => ({ key: k, ctrlKey: false, metaKey: false, altKey: false, ...mods });
const actions: MenuAction[] = [{ id: "newTask", label: "Create task", href: "/a" }, { id: "search", label: "Open search", href: "/b" }];

describe("command menu", () => {
  it("opens on Cmd+K or Ctrl+K only", () => {
    expect(isMenuKey(key("k", { metaKey: true }))).toBe(true);
    expect(isMenuKey(key("K", { ctrlKey: true }))).toBe(true);
    expect(isMenuKey(key("k"))).toBe(false);
    expect(isMenuKey(key("k", { ctrlKey: true, altKey: true }))).toBe(false);
  });
  it("filters actions by typed text", () => {
    expect(matchActions(actions, "")).toHaveLength(2);
    expect(matchActions(actions, " TASK ").map((a) => a.id)).toEqual(["newTask"]);
    expect(matchActions(actions, "zzz")).toEqual([]);
  });
  it("wraps the active row", () => {
    expect(stepActive(0, -1, 3)).toBe(2);
    expect(stepActive(2, 1, 3)).toBe(0);
    expect(stepActive(0, 1, 0)).toBe(-1);
  });
});
