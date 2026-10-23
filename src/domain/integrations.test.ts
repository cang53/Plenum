import { describe, expect, it } from "vitest";
import { checkSwitches } from "@/server/switches";
import { integrationRows } from "./integrations";

describe("integrationRows", () => {
  it("gives every switch a row and attaches last-read times to email and triage only", () => {
    const rows = integrationRows(checkSwitches({ EMAIL_PROVIDER: "ses" }), { email: "2026-10-22T09:00:00Z", triage: "2026-10-22T10:00:00Z" });
    expect(rows).toHaveLength(4);
    expect(rows.map((r) => r.lastRead)).toEqual([null, "2026-10-22T09:00:00Z", "2026-10-22T10:00:00Z", null]);
    expect(rows[1].live).toBe(true);
    expect(rows[0].live).toBe(false);
  });
});
