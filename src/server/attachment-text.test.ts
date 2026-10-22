import { describe, expect, it } from "vitest";
import { attachmentText, MAX_ATTACHMENT_BYTES, MAX_TEXT_PER_ATTACHMENT } from "./attachment-text";

const file = (filename: string, contentType: string, content: string | Buffer) => ({
  filename, contentType, content: Buffer.from(content),
});

describe("attachmentText", () => {
  it("reads plain text and labels it with the file name", async () => {
    expect(await attachmentText([file("a.txt", "text/plain", "Move the  lift\nto Friday")])).toBe("[Attachment a.txt]\nMove the lift to Friday");
  });

  it("skips unreadable, unsupported and oversize files", async () => {
    const big = Buffer.alloc(MAX_ATTACHMENT_BYTES + 1, "a");
    expect(
      await attachmentText([
        file("broken.pdf", "application/pdf", "not a pdf"),
        file("broken.docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "not a zip"),
        file("pic.png", "image/png", "xx"),
        file("big.txt", "text/plain", big),
      ]),
    ).toBe("");
  });

  it("caps the text per attachment", async () => {
    const out = await attachmentText([file("long.txt", "text/plain", "word ".repeat(5000))]);
    expect(out.length).toBeLessThanOrEqual(MAX_TEXT_PER_ATTACHMENT + 30);
  });
});
