import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { demoMessages, demoProject, demoSuggestions } from "@/data/demo";
import { Timeline } from "./Timeline";

describe("Timeline", () => {
  const now = new Date();
  const html = renderToStaticMarkup(
    <Timeline messages={demoMessages(now)} suggestions={demoSuggestions} now={now.toISOString()} timeZone={demoProject.timeZone} />,
  );
  it("marks today's day group", () => {
    expect(html).toContain('data-today="true"');
  });
  it("gives every message a state with a text label, not colour alone", () => {
    const bars = html.match(/<article[^>]*data-state="(suggested|linked|new)"/g) ?? [];
    expect(bars.length).toBe(demoMessages(now).length);
    expect(html).toMatch(/class="badge badge-warning">Needs a decision/);
  });
  it("offers a reply button only when the page can send replies", () => {
    const withReply = renderToStaticMarkup(
      <Timeline messages={demoMessages(now)} suggestions={[]} now={now.toISOString()} timeZone={demoProject.timeZone} onReply={async () => "sent"} />,
    );
    expect(withReply).toContain("Reply by email");
    expect(html).not.toContain("Reply by email");
  });
});
