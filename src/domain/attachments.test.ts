import { describe, expect, it } from "vitest";
import { checkFiles, safeName, sizeLabel } from "./attachments";

const f = (type: string, size = 1000) => ({ name: "a", type, size });

describe("checkFiles", () => {
  it("accepts pictures, PDFs and office files", () => {
    expect(checkFiles([f("image/png"), f("application/pdf"), f("application/vnd.openxmlformats-officedocument.wordprocessingml.document")])).toBeNull();
  });
  it("rejects programs and other types", () => {
    expect(checkFiles([f("application/x-msdownload")])).toBe("stream.file.type");
    expect(checkFiles([f("image/svg+xml")])).toBe("stream.file.type");
  });
  it("limits the count and the total size", () => {
    expect(checkFiles(Array.from({ length: 6 }, () => f("image/png")))).toBe("stream.file.tooMany");
    expect(checkFiles([f("image/png", 6 * 1048576), f("image/png", 5 * 1048576)])).toBe("stream.file.tooBig");
  });
});

describe("safeName and sizeLabel", () => {
  it("makes a storage-safe name", () => {
    expect(safeName("../Plan ç 1.pdf")).toBe("_Plan_c_1.pdf");
    expect(safeName("...")).toBe("file");
  });
  it("shows KB or MB", () => {
    expect(sizeLabel(482_000)).toBe("471 KB");
    expect(sizeLabel(2_621_440)).toBe("2.5 MB");
  });
});
