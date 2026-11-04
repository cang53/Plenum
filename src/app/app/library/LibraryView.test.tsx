import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { folderTree } from "@/domain/library";
import { t as tr, type MessageKey } from "@/lib/messages";
import { LibraryView } from "./LibraryView";

const t = (k: MessageKey) => tr(k);
const en = new Proxy({} as Record<MessageKey, string>, { get: (_, k) => tr(k as MessageKey) });
const noop = () => {};
const base = { t, project: { id: "p", name: "Atlas" }, workspaceId: "w", projectParam: "", at: "p:", heading: "Project files", crumbs: [{ label: "Project files", at: "p:" }],
  tree: folderTree(["Contracts"]), counts: { lessons: 1, "p:": 1, "p:Contracts": 0, stream: 2 }, subfolders: folderTree(["Contracts"]), rows: [{ key: "d:1", title: "Plan", ext: "PDF", meta: "1 KB" }],
  selected: "d:1", preview: null, canWrite: true, canCreateFolder: true, href: (a: string, f?: string | null) => `/x?at=${a}${f ? `&file=${f}` : ""}`, actions: { add: noop, remove: noop, newFolder: noop } };

describe("LibraryView", () => {
  it("shows the three roots, folders and files", () => {
    const h = renderToStaticMarkup(<LibraryView {...base} />);
    expect(h).toContain(en["library.lessons"]); expect(h).toContain(en["library.stream"]); expect(h).toContain("Contracts"); expect(h).toContain("Plan");
  });
  it("previews text and offers removal only for library documents", () => {
    const preview = { key: "d:1", title: "Plan", filename: "plan.pdf", contentType: "application/pdf", sizeBytes: 10, kind: "text" as const, text: "Hello body", imageUrl: null, downloadUrl: "https://x/y", source: "Project files", ext: "PDF" };
    const h = renderToStaticMarkup(<LibraryView {...base} preview={preview} />);
    expect(h).toContain("Hello body"); expect(h).toContain(en["library.remove"]);
    expect(renderToStaticMarkup(<LibraryView {...base} preview={{ ...preview, key: "s:1" }} />)).not.toContain(en["library.remove"]);
  });
});
