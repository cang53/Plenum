import { describe, expect, it, vi } from "vitest";
import { sendDigests } from "@/server/digest-run";

const base = { workspaceId: "w", projectId: "p", projectName: "P", newSuggestions: [], dueTasks: [] };

describe("sendDigests", () => {
  it("sends one email per person with something to say and keeps going after a failure", async () => {
    const send = vi.fn().mockRejectedValueOnce(new Error("boom")).mockResolvedValue(undefined);
    const rows = [
      { ...base, email: "a@x.com", dueTasks: ["T1"] },
      { ...base, email: "b@x.com" },
      { ...base, email: "c@x.com", newSuggestions: ["S1"] },
    ];
    const onError = vi.fn();
    expect(await sendDigests(async () => rows, { send }, onError)).toBe(1);
    expect(send).toHaveBeenCalledTimes(2);
    expect(send.mock.calls[1][0].to).toEqual(["c@x.com"]);
    expect(onError).toHaveBeenCalledOnce();
  });
});
