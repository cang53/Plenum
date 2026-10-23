import { describe, expect, it } from "vitest";
import { buildTranslatePrompt, parseTranslation } from "./translate";

describe("parseTranslation", () => {
  it("reads the text field, even with chatter around the JSON", () => {
    expect(parseTranslation('Here: {"text":" Hallo "} done')).toBe("Hallo");
  });
  it("rejects empty, missing or malformed answers", () => {
    for (const bad of ['{"text":""}', '{"x":1}', "nope", '{"text":5}']) expect(parseTranslation(bad)).toBeNull();
  });
});

describe("buildTranslatePrompt", () => {
  it("names the target language", () => {
    expect(buildTranslatePrompt("Hi", "Body", "nl")).toContain("Language: Dutch");
  });
});
