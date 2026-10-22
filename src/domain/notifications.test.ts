import { describe, expect, it } from "vitest";
import { notificationHref } from "@/domain/notifications";

describe("notificationHref", () => {
  it("sends tasks and suggestions to items", () => {
    expect(notificationHref("task_assigned", "p1")).toBe("/app/items?project=p1");
    expect(notificationHref("suggestion_new", "p1")).toBe("/app/items?project=p1");
  });
  it("sends accepted invitations to people", () => {
    expect(notificationHref("invitation_accepted", "p1")).toBe("/app/members?project=p1");
  });
});
