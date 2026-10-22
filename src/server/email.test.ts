import { describe, expect, it } from "vitest";
import { outboxSender } from "./email";
import { handlePastedMessage } from "./dev-inbound";

describe("fake email sender", () => {
  it("writes the email to the outbox", async () => {
    const rows: Record<string, unknown>[] = [];
    await outboxSender(async (r) => void rows.push(r)).send({ workspaceId: "w", to: ["a@x.com"], subject: "Hi", bodyText: "Body" });
    expect(rows).toEqual([{ workspace_id: "w", project_id: null, to_addresses: ["a@x.com"], subject: "Hi", body_text: "Body" }]);
  });

  it("refuses an email with no recipient", async () => {
    await expect(outboxSender(async () => {}).send({ workspaceId: "w", to: [], subject: "", bodyText: "" })).rejects.toThrow();
  });
});

describe("pasted inbound message", () => {
  it("stores it for the project address", async () => {
    const result = await handlePastedMessage({ slug: "line4", from: "jan@x.com", subject: "S", body: "B" }, async (e) => {
      expect(e).toMatchObject({ emailSlug: "line4", fromAddress: "jan@x.com", subject: "S", bodyText: "B" });
      return "m1";
    });
    expect(result).toEqual({ status: 201, body: { id: "m1" } });
  });

  it("rejects missing fields and unknown projects", async () => {
    expect((await handlePastedMessage({ from: "a@x.com" }, async () => "m")).status).toBe(400);
    expect((await handlePastedMessage({ slug: "nope", from: "a@x.com" }, async () => null)).status).toBe(404);
  });
});
