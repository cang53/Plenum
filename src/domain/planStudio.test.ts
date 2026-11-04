import { describe, expect, it } from "vitest";
import { baseLoad, bestOwner, CAPACITY, parseDraft, placeDraft, ruleEdit, stepsFromNotes, weekDates, type Draft, type Person } from "./planStudio";

const people: Person[] = [{ userId: "a", name: "Mila V.", role: "member" }, { userId: "b", name: "Jan K.", role: "project_manager" }, { userId: "c", name: "Cy", role: "contributor" }];
const base = baseLoad(people, [{ title: "x", startDate: "2026-11-02", dueDate: "2026-11-13", ownerId: "a" }], "2026-11-02");
const weeks = ["W45", "W46", "W47", "W48", "W49", "W50", "W51", "W52"];
const step = (id: number, title: string, s: number, l: number, owner: string | null = null): Draft => ({ id, title, s, l, owner, why: "" });

describe("studio", () => {
  it("maps weeks to dates, Monday to Friday", () => {
    expect(weekDates("2026-11-02", 1, 2)).toEqual({ startDate: "2026-11-09", dueDate: "2026-11-20" });
  });
  it("counts tasks per week", () => {
    expect(base.a.slice(0, 3)).toEqual([1, 1, 0]);
  });
  it("picks the less busy person and never a contributor", () => {
    expect(bestOwner(step(1, "t", 0, 2), [], people, base)).toBe("b");
  });
  it("returns null when everyone would be full", () => {
    const full = Array.from({ length: CAPACITY }, (_, i) => step(10 + i, "f", 0, 1, "b")).concat(Array.from({ length: CAPACITY }, (_, i) => step(20 + i, "g", 0, 1, "a")));
    expect(bestOwner(step(1, "t", 0, 1), full, people, base)).toBeNull();
  });
  it("drops unknown or contributor owners and places the rest", () => {
    const out = placeDraft([step(1, "t", 0, 1, "zzz"), step(2, "u", 0, 1, "c")], people, base);
    expect(out.every((s) => s.owner === "a" || s.owner === "b")).toBe(true);
  });
  it("parses the model answer and ignores junk", () => {
    const r = parseDraft('{"reply":"ok","steps":[{"title":"Call","start_week":1,"weeks":2,"owner":"Jan K."},{"title":""}]}', people);
    expect(r?.steps).toEqual([{ id: 1, title: "Call", s: 1, l: 2, owner: "b", why: "" }]);
    expect(parseDraft("nope", people)).toBeNull();
  });
  it("clamps weeks into the grid", () => {
    expect(parseDraft('{"steps":[{"title":"x","start_week":9,"weeks":5}]}', people)?.steps[0]).toMatchObject({ s: 3, l: 5 });
  });
  it("offline rules move, assign, shorten, add and remove", () => {
    const s = [step(1, "Backup supplier quote", 2, 2), step(2, "Weekly supplier call", 1, 5, "b")];
    expect(ruleEdit("move the quote to W49", s, people, base, weeks).steps[0].s).toBe(4);
    expect(ruleEdit("give the quote to Mila", s, people, base, weeks).steps[0].owner).toBe("a");
    expect(ruleEdit("make the plan shorter", s, people, base, weeks).steps[1].l).toBe(3);
    expect(ruleEdit("add a client briefing", s, people, base, weeks).steps).toHaveLength(3);
    expect(ruleEdit("remove the weekly call", s, people, base, weeks).steps.map((x) => x.id)).toEqual([1]);
    expect(ruleEdit("hello", s, people, base, weeks).reply.key).toBe("ps.r.help");
  });
  it("turns notes into one step per line", () => {
    expect(stepsFromNotes("1. Call the supplier.\n2) Get a quote\n\n- Tell the client").map((x) => [x.title, x.s])).toEqual([["Call the supplier", 0], ["Get a quote", 1], ["Tell the client", 2]]);
  });
});
