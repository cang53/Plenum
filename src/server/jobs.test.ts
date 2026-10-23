import { describe, expect, it, vi } from "vitest";
import { runJobs, type JobStore } from "@/server/jobs";

const mail = { workspaceId: "w", to: ["a@x.com"], subject: "S", bodyText: "B", attempt: 1 };
const store = (claimed: string[], over: Partial<JobStore> = {}): JobStore => ({
  claim: async (job) => claimed.includes(job),
  finish: vi.fn(async () => {}),
  failedEmails: async () => [mail],
  purge: async () => 3,
  draftReports: async () => 2,
  digestRows: async () => [],
  ...over,
});

describe("runJobs", () => {
  it("skips a job that was already claimed", async () => {
    const send = vi.fn();
    const s = store([]);
    expect(await runJobs(s, { send })).toEqual({ digest: { ran: false }, purge: { ran: false }, "status-report": { ran: false }, "retry-send": { ran: false } });
    expect(send).not.toHaveBeenCalled();
    expect(s.finish).not.toHaveBeenCalled();
  });

  it("resends failed emails with the next attempt number and records the run", async () => {
    const send = vi.fn(async () => {});
    const s = store(["retry-send"]);
    const out = await runJobs(s, { send });
    expect(send).toHaveBeenCalledWith({ ...mail, attempt: 2 });
    expect(out["retry-send"]).toEqual({ ran: true, detail: "1 resent" });
    expect(s.finish).toHaveBeenCalledWith("retry-send", true, "1 resent");
  });

  it("runs the retention purge and records how many messages it emptied", async () => {
    const s = store(["purge"]);
    expect((await runJobs(s, { send: async () => {} })).purge).toEqual({ ran: true, detail: "3 purged" });
    expect(s.finish).toHaveBeenCalledWith("purge", true, "3 purged");
  });

  it("drafts the weekly status reports (drafts only, nothing is emailed)", async () => {
    const send = vi.fn();
    const s = store(["status-report"]);
    expect((await runJobs(s, { send }))["status-report"]).toEqual({ ran: true, detail: "2 drafted" });
    expect(send).not.toHaveBeenCalled();
  });

  it("records a failing job without stopping the others", async () => {
    const s = store(["digest", "retry-send"], { digestRows: async () => { throw new Error("db"); } });
    const out = await runJobs(s, { send: async () => {} });
    expect(out.digest).toEqual({ ran: true, error: true });
    expect(s.finish).toHaveBeenCalledWith("digest", false, "failed");
    expect(out["retry-send"].ran).toBe(true);
  });
});
