import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { t as tr } from "@/lib/messages";
import { EmptyState, ItemsSkeleton, Notice, SaveToast } from "./Notice";

vi.mock("./actions", () => ({ saveItem: async () => ({ status: "idle" }) }));

describe("notices", () => {
  it("announces danger notices as alerts and leaves the rest quiet", () => {
    expect(renderToStaticMarkup(<Notice tone="danger" title="Could not save" />)).toContain('role="alert"');
    expect(renderToStaticMarkup(<Notice tone="info" title="Demo" />)).not.toContain("role=");
  });
  it("shows the toast politely with a link, and skeleton rows as busy with a spoken label", () => {
    const toast = renderToStaticMarkup(<SaveToast title="Saved." href="/x" link="View item" />);
    expect(toast).toContain('aria-live="polite"');
    expect(toast).toContain('href="/x"');
    const skeleton = renderToStaticMarkup(<ItemsSkeleton rows={2} label="Loading Items" />);
    expect(skeleton).toContain('aria-busy="true"');
    expect(skeleton.match(/skeleton-row/g)).toHaveLength(2);
    expect(renderToStaticMarkup(<EmptyState title="No items yet" body="Create one" />)).toContain("Create one");
  });
});

describe("SaveForm", () => {
  it("renders Cancel and the save button, disabled with a demo notice", async () => {
    const { SaveForm } = await import("./SaveForm");
    const { saveText } = await import("./ItemFields");
    const text = saveText((k) => tr(k, "en"), "Create task");
    const html = renderToStaticMarkup(<SaveForm action={async () => ({ status: "idle" })} text={text} cancelHref="/back" reloadHref="/r" demo label="Create task"><input name="title" /></SaveForm>);
    expect(html).toContain('href="/back"');
    expect(html).toContain("Create task");
    expect(html).toContain("This is a demo");
    expect(html).toMatch(/<button type="submit"[^>]*disabled/);
  });
});
