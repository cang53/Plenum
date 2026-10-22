import { describe, expect, it } from "vitest";
import { needsInviteStep, projectAddress } from "./onboarding";

const fresh = { projects: 1, members: 1, invitations: 0, finished: false };

describe("needsInviteStep", () => {
  it("resumes for a new workspace nobody has joined", () => expect(needsInviteStep(fresh)).toBe(true));
  it.each([
    { finished: true },
    { invitations: 1 },
    { members: 2 },
    { projects: 2 },
    { projects: 0 },
  ])("stops when %o", (o) => expect(needsInviteStep({ ...fresh, ...o })).toBe(false));
});

describe("projectAddress", () => {
  it("joins slug and domain", () => expect(projectAddress("line4", "in.plenum.eu")).toBe("line4@in.plenum.eu"));
  it("falls back to the slug without a domain", () => expect(projectAddress("line4", undefined)).toBe("line4"));
});
