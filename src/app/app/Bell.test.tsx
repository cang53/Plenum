import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Bell } from "./Bell";

const props = { href: "/app/notifications?project=p1", label: "Inbox", countLabel: (n: number) => `${n} unread` };

describe("Bell", () => {
  it("links to notifications and names the link with the unread count", () => {
    const html = renderToStaticMarkup(<Bell {...props} initial={3} />);
    expect(html).toContain('href="/app/notifications?project=p1"');
    expect(html).toContain("Inbox: 3 unread");
    expect(html).not.toMatch(/hidden/);
  });
  it("is just the link, with the badge hidden, when nothing is unread", () => {
    const html = renderToStaticMarkup(<Bell {...props} initial={0} />);
    expect(html).toMatch(/\"Inbox\"/);
    expect(html).toMatch(/role="status"[^>]*hidden/);
  });
  it("caps a long count", () => {
    expect(renderToStaticMarkup(<Bell {...props} initial={120} />)).toContain("99+");
  });
});
