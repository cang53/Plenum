import { describe, expect, it } from "vitest";
import { filterMentions, type MentionItem } from "./mentions";
import { sanitizeHtml } from "./richtext";

const items: MentionItem[] = [
  { id: "1", type: "task", label: "Order pump", href: "/app/tasks/1" },
  { id: "2", type: "person", label: "Pim", href: "/app/members" },
  { id: "3", type: "risk", label: "Pump delay", href: "/app/risks/3" },
  { id: "4", type: "agent", label: "CobIA", href: "/app/stream" },
];

describe("filterMentions", () => {
  it("lists people and CobIA before project items when nothing is typed", () => {
    expect(filterMentions(items, "").map((i) => i.id)).toEqual(["2", "4", "1", "3"]);
  });
  it("filters as you type, best matches first", () => {
    expect(filterMentions(items, "pump").map((i) => i.id)).toEqual(["3", "1"]);
    expect(filterMentions(items, "zzz")).toEqual([]);
  });
  it("caps the list", () => {
    expect(filterMentions(items, "", 2)).toHaveLength(2);
  });
});

describe("mention chips in messages", () => {
  it("keeps a link to an item in the app", () => {
    expect(sanitizeHtml('<a class="x" onclick="y" href="/app/tasks/1">@Order pump</a>')).toBe('<a class="mention" href="/app/tasks/1">@Order pump</a>');
  });
  it("drops any other link but keeps its words", () => {
    expect(sanitizeHtml('<a href="https://evil.example">@Pim</a>')).toBe("@Pim");
    expect(sanitizeHtml('<a href="javascript:alert(1)">@Pim</a>')).toBe("@Pim");
  });
});
