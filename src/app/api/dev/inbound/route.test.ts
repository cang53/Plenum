import { afterEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

describe("dev inbound route", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("answers 404 in production before reading anything", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const response = await POST(new Request("http://x/api/dev/inbound", { method: "POST", body: "{}" }));
    expect(response.status).toBe(404);
  });
});
