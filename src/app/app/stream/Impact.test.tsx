import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Impact } from "./StreamView";
import type { AgentProposal } from "@/domain/agent";

const a = { id: "1", messageId: "m", kind: "update_task", title: "Pour slab", details: "", startDate: "2026-11-09", dueDate: "2026-11-20", reason: "", before: { startDate: "2026-11-09", dueDate: "2026-11-16" } } as AgentProposal;
const html = (p: AgentProposal, done: boolean) => renderToStaticMarkup(<Impact a={p} label="Impact" before="Before" after="After" done={done} />);

describe("Impact", () => {
  it("shows the old and the proposed dates, green once accepted", () => {
    expect(html(a, false)).toContain('class="now"');
    expect(html(a, false)).toContain('class="was"');
    expect(html(a, true)).toContain('class="now done"');
  });
  it("has nothing to show for a dependency", () => {
    expect(html({ ...a, kind: "add_dependency", dueDate: null }, false)).toBe("");
  });
});
