import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { t } from "@/lib/messages";
import { LibraryView } from "./LibraryView";

const act = () => {};
const lessons = [{ id: "1", title: "Late supplier delivery", bodyText: "Order long-lead items before the design freeze.", filename: "late.pdf", sizeBytes: 20480, createdAt: "2026-03-10T10:00:00Z" }];
const render = (staff: boolean, docs = lessons) => renderToStaticMarkup(<LibraryView t={t} locale="en-GB" project={{ name: "Dock 3" }} workspaceId="w" lessons={docs} staff={staff} add={act} remove={act} />);

describe("LibraryView", () => {
  it("lists lessons with an excerpt, and lets staff add and remove", () => {
    const html = render(true);
    expect(html).toContain("Late supplier delivery");
    expect(html).toContain("Order long-lead items");
    expect(html).toContain(t("library.addButton"));
    expect(html).toContain(t("library.remove"));
  });
  it("hides add and remove from people who are not staff", () => {
    const html = render(false);
    expect(html).not.toContain(t("library.addButton"));
    expect(html).not.toContain(t("library.remove"));
  });
  it("says so when the folder is empty", () => {
    expect(render(true, [])).toContain(t("library.empty"));
  });
});
