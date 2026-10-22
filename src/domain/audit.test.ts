import { describe, expect, it } from "vitest";
import { auditCsv, type AuditRow } from "./audit";

const row: AuditRow = {
  created_at: "2026-10-22T09:00:00Z",
  project_id: "p1",
  actor_id: null,
  action: "accepted",
  entity_type: "suggestions",
  entity_id: "s1",
  source_message_id: "m1",
};

describe("auditCsv", () => {
  it("writes a header and one quoted line per row", () => {
    const lines = auditCsv([row]).trimEnd().split("\r\n");
    expect(lines).toHaveLength(2);
    expect(lines[0]).toBe('"created_at","project_id","actor_id","action","entity_type","entity_id","source_message_id"');
    expect(lines[1]).toBe('"2026-10-22T09:00:00Z","p1","","accepted","suggestions","s1","m1"');
  });

  it("escapes quotes and neutralises spreadsheet formulas", () => {
    const out = auditCsv([{ ...row, action: '=HYPERLINK("x")' }]);
    expect(out).toContain(`"'=HYPERLINK(""x"")"`);
  });

  it("gives only the header for no rows", () => {
    expect(auditCsv([]).trimEnd().split("\r\n")).toHaveLength(1);
  });
});
