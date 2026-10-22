import { describe, expect, it } from "vitest";
import { messages, t } from "./messages";

describe("t", () => {
  it("returns the English string for a key", () => {
    expect(t("app.name")).toBe("Plenum");
  });

  it("has no empty strings", () => {
    for (const value of Object.values(messages.en)) {
      expect(value.trim()).not.toBe("");
    }
  });
});
