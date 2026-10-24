import { describe, expect, it } from "vitest";
import { shortcutFor } from "./shortcuts";

const key = (k: string, extra = {}) => shortcutFor({ key: k, ctrlKey: false, metaKey: false, altKey: false, typing: false, ...extra });

describe("shortcutFor", () => {
  it("maps the keys", () => {
    expect(["/", "c", "j", "k", "?"].map((k) => key(k))).toEqual(["search", "new", "next", "prev", "help"]);
  });
  it("stays out of the way while typing or with a modifier", () => {
    expect(key("c", { typing: true })).toBeNull();
    expect(key("c", { metaKey: true })).toBeNull();
    expect(key("x")).toBeNull();
  });
});
