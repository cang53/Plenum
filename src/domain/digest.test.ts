import { describe, expect, it } from "vitest";
import { buildDigest, type DigestRow } from "@/domain/digest";

const row: DigestRow = { email: "mo@example.com", workspaceId: "w", projectId: "p", projectName: "Line 4", newSuggestions: [], dueTasks: [] };

describe("buildDigest", () => {
  it("sends nothing when there is nothing new or due", () => {
    expect(buildDigest(row)).toBeNull();
  });
  it("lists only the sections that have items, addressed to that person", () => {
    const mail = buildDigest({ ...row, dueTasks: ["Fix valve"] })!;
    expect(mail.to).toEqual(["mo@example.com"]);
    expect(mail.subject).toContain("Line 4");
    expect(mail.bodyText).toContain("- Fix valve");
    expect(mail.bodyText).not.toContain("New suggestions");
  });
});
