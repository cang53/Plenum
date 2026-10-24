import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { Shortcuts } from "./Shortcuts";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: () => {} }) }));

describe("Shortcuts", () => {
  it("renders a help sheet listing every shortcut", () => {
    const labels = { title: "Sheet", close: "Close", search: "Search", new: "New", next: "Next", prev: "Previous", help: "Help" };
    const html = renderToStaticMarkup(<Shortcuts labels={labels} />);
    expect(html).toContain(`aria-label=${JSON.stringify(labels.title)}`);
    for (const k of ["/", "c", "j", "k", "?"]) expect(html).toContain(`<kbd>${k}</kbd>`);
  });
});
