import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { DocumentTag } from "./DocumentTag";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

const base = { id: "a", filename: "x.pdf", contentType: "application/pdf", sizeBytes: 1, docType: "drawing" as const, docRef: "A-101", revision: "B", superseded: false };

describe("DocumentTag", () => {
  it("flags the newest revision and offers the form only to managers", () => {
    const plain = renderToStaticMarkup(<DocumentTag attachment={base} language="en" />);
    expect(plain).toContain("Latest revision");
    expect(plain).not.toContain("Tag document");
    const manager = renderToStaticMarkup(<DocumentTag attachment={{ ...base, superseded: true }} onTag={async () => {}} language="en" />);
    expect(manager).toContain("Superseded");
    expect(manager).toContain("Tag document");
  });
});
