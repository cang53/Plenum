import { describe, expect, it, vi } from "vitest";
import { sendStatusReport } from "@/server/status-report";

const report = { workspace_id: "w", project_id: "p", project_name: "Alpha", body_text: "Done: A", to_addresses: ["pm@x.com"] };

describe("sendStatusReport", () => {
  it("sends the claimed report to the project managers", async () => {
    const send = vi.fn(async () => {});
    await sendStatusReport(async () => report, { send }, (n) => `Weekly status: ${n}`);
    expect(send).toHaveBeenCalledWith({ workspaceId: "w", projectId: "p", to: ["pm@x.com"], subject: "Weekly status: Alpha", bodyText: "Done: A" });
  });

  it("sends nothing when the claim is refused", async () => {
    const send = vi.fn();
    await expect(sendStatusReport(async () => { throw new Error("already sent"); }, { send }, String)).rejects.toThrow("already sent");
    expect(send).not.toHaveBeenCalled();
  });
});
