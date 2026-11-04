import { describe, expect, it } from "vitest";
import { buildUserPrompt, parseSuggestion, toDraft } from "./triage";

describe("parseSuggestion", () => {
  it("reads a valid answer, also when wrapped in text or a code fence", () => {
    const answer = 'Here you go:\n```json\n{"kind":"risk","title":" Gearbox late ","details":"Slips to 28 Nov.","reason":" The email says 28 Nov. "}\n```';
    expect(parseSuggestion(answer)).toEqual({ kind: "risk", title: "Gearbox late", details: "Slips to 28 Nov.", reason: "The email says 28 Nov.", riskKind: "risk", likelihood: 3, severity: 3 });
  });

  it("returns nothing when the model sees nothing to track", () => {
    expect(parseSuggestion('{"kind":"none"}')).toBeNull();
  });

  it.each(["", "no json here", "{broken", '{"kind":"epic","title":"x"}', '{"kind":"task"}', '{"kind":"task","title":"  "}', '{"kind":"task","title":"x"}', '{"kind":"task","title":"x","reason":" "}', "[1]"])(
    "treats %j as no suggestion",
    (answer) => expect(parseSuggestion(answer)).toBeNull(),
  );

  it("keeps details optional and caps long text", () => {
    const parsed = parseSuggestion(JSON.stringify({ kind: "task", title: "t".repeat(300), details: "d".repeat(900), reason: "r".repeat(900) }));
    expect(parsed?.title).toHaveLength(120);
    expect(parsed?.details).toHaveLength(500);
    expect(parsed?.reason).toHaveLength(300);
    expect(parseSuggestion('{"kind":"task","title":"x","reason":"r"}')?.details).toBe("");
  });
});

describe("parseSuggestion risks", () => {
  it("reads type, likelihood and severity, clamped to 1 to 5", () => {
    const risk = parseSuggestion('{"kind":"risk","title":"t","reason":"r","type":"issue","likelihood":9,"severity":2.4}');
    expect(risk).toMatchObject({ riskKind: "issue", likelihood: 5, severity: 2 });
  });
  it("defaults to a medium risk and adds nothing to other kinds", () => {
    expect(parseSuggestion('{"kind":"risk","title":"t","reason":"r"}')).toMatchObject({ riskKind: "risk", likelihood: 3, severity: 3 });
    expect(parseSuggestion('{"kind":"task","title":"t","reason":"r","likelihood":4}')).not.toHaveProperty("likelihood");
  });
  it("carries the scores into the draft", () => {
    expect(toDraft({ kind: "risk", title: "t", details: "", reason: "r", riskKind: "issue", likelihood: 5, severity: 4 })).toEqual({ kind: "risk", title: "t", details: "", riskKind: "issue", likelihood: 5, severity: 4 });
  });
});

describe("buildUserPrompt", () => {
  it("includes sender, subject and a capped body", () => {
    const prompt = buildUserPrompt({
      id: "m", source: "email", fromName: null, fromAddress: "a@b.example", subject: "Hi", bodyText: "x".repeat(10_000),
      receivedAt: "2026-10-22T09:00:00Z", attachments: [],
    });
    expect(prompt.startsWith("From: a@b.example\nSubject: Hi\n\n")).toBe(true);
    expect(prompt.length).toBeLessThan(6100);
  });
});

describe("toDraft", () => {
  it("turns a suggestion into an editable draft", () => {
    expect(toDraft({ kind: "decision", title: "T", details: "D", reason: "R" })).toEqual({ kind: "decision", title: "T", details: "D" });
  });
});
