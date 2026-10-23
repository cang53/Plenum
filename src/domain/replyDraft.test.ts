import { describe, expect, it } from "vitest";
import { buildReplyDraftPrompt, parseReplyDraft } from "./replyDraft";

describe("reply draft", () => {
  it("puts subject and body in the prompt", () => expect(buildReplyDraftPrompt("Hi", "Body")).toBe("Hi\n\nBody"));
  it("parses the draft and rejects unusable answers", () => {
    expect(parseReplyDraft('ok {"text":" Dank u. "}')).toBe("Dank u.");
    expect(parseReplyDraft("{}")).toBeNull();
    expect(parseReplyDraft('{"text":"  "}')).toBeNull();
    expect(parseReplyDraft("nope")).toBeNull();
  });
});
