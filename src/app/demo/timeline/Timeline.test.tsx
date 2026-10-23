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
  it("shows each suggestion with Accept, Edit and Dismiss buttons and a link to its source message", () => {
    for (const name of ["Accept", "Edit", "Dismiss"]) expect(html).toContain(`>${name}</button>`);
    const href = html.match(/Source message: <a href="#(message-[^"]+)"/)?.[1];
    expect(href).toBeTruthy();
    expect(html).toContain(`id="${href}"`);
  });
});

describe("Timeline translation", () => {
  const now = new Date();
  const render = (onTranslate?: () => Promise<string | null>) =>
    renderToStaticMarkup(<Timeline messages={demoMessages(now)} suggestions={[]} now={now.toISOString()} timeZone={demoProject.timeZone} onTranslate={onTranslate} />);
  it("offers translation only where the page can translate", () => {
    expect(render()).not.toContain("Translate this message");
    expect(render(async () => null)).toContain("Translate this message");
  });
});
