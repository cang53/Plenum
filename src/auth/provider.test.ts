import { describe, expect, it } from "vitest";
import { authProvider, needsSession, safeNext } from "./provider";

describe("authProvider", () => {
  it("defaults to the Supabase email link", () => {
    expect(authProvider({})).toBe("supabase");
    expect(authProvider({ AUTH_PROVIDER: "nonsense" })).toBe("supabase");
  });
  it("switches to Entra", () => {
    expect(authProvider({ AUTH_PROVIDER: "entra" })).toBe("entra");
  });
});

describe("safeNext", () => {
  it("keeps same-site paths", () => {
    expect(safeNext("/app/tasks?x=1")).toBe("/app/tasks?x=1");
  });
  it.each([null, undefined, "", "https://evil.example", "//evil.example", "/\\evil.example", "app"])(
    "falls back for %s",
    (value) => expect(safeNext(value)).toBe("/app"),
  );
});

describe("needsSession", () => {
  it("protects /app only", () => {
    expect(needsSession("/app")).toBe(true);
    expect(needsSession("/app/tasks")).toBe(true);
    expect(needsSession("/application")).toBe(false);
    expect(needsSession("/login")).toBe(false);
    expect(needsSession("/demo/board")).toBe(false);
  });
});
