import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { listLinkedItems } from "./live";

describe("listLinkedItems", () => {
  it("asks for the kind column only on risks, the other tables do not have it", async () => {
    const asked: Record<string, string> = {};
    const client = { from: (table: string) => ({ select: (cols: string) => { asked[table] = cols; const q = { eq: () => q, in: () => q, returns: () => q, then: (r: (v: unknown) => void) => r({ data: [], error: null }) }; return q; } }) } as unknown as SupabaseClient;
    await listLinkedItems(client, "p", ["m"]);
    expect(asked.risks).toContain("kind");
    for (const [t, c] of Object.entries(asked)) if (t !== "risks") expect(c).not.toContain("kind");
  });
});
