import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CreateOption, GroupHead, ItemsHead, matchesItem } from "./ItemsHead";

const item = { kind: "task", title: "Install gearbox", details: "Crane on site", status: "todo", ownerId: "u1", phaseId: "p1" };
const all = { q: "", kind: "", status: "", owner: "", phase: "" };
const t = (k: string) => (k === "board.pending" ? "{n} waiting" : k);

describe("matchesItem", () => {
  it("matches title or details, case-insensitive, and every chip", () => {
    expect(matchesItem(item, all)).toBe(true);
    expect(matchesItem(item, { ...all, q: "CRANE" })).toBe(true);
    expect(matchesItem(item, { ...all, q: "permit" })).toBe(false);
    expect(matchesItem(item, { ...all, kind: "risk" })).toBe(false);
    expect(matchesItem(item, { ...all, status: "todo", owner: "u1", phase: "p1" })).toBe(true);
    expect(matchesItem(item, { ...all, owner: "u2" })).toBe(false);
  });
});

describe("ItemsHead", () => {
  it("keeps hidden params, preselects chips and shows the pending notice only when needed", () => {
    const html = renderToStaticMarkup(<ItemsHead t={t} action="/app/items" keep={[["project", "p"], ["col", "owner"]]} query={{ ...all, status: "blocked" }} owners={{ u1: "Ana" }} phases={{}} pending={2} reviewHref="/r" create={null} />);
    expect(html).toContain('name="project" value="p"');
    expect(html).toContain('name="col" value="owner"');
    expect(html).toMatch(/<option value="blocked" selected="">/);
    expect(html).toContain("2 waiting");
    expect(renderToStaticMarkup(<ItemsHead t={t} action="/a" keep={[]} query={all} owners={{}} phases={{}} pending={0} reviewHref="/r" create={null} />)).not.toContain("items-pending");
  });
  it("counts rows per status and skips empty statuses", () => {
    const html = renderToStaticMarkup(<GroupHead title="Tasks" rows={[{ status: "todo" }, { status: "todo" }, { status: "done" }]} label={(s) => s.toUpperCase()} />);
    expect(html).toContain("Tasks · 3");
    expect(html).toContain("2 todo · 1 done");
    expect(renderToStaticMarkup(<GroupHead title="Decisions" rows={[{ status: "" }]} label={(s) => s} />)).not.toContain("1 ");
  });
});

describe("CreateOption", () => {
  it("shows the kind name, its help line and the form inside", () => {
    const html = renderToStaticMarkup(<CreateOption kind="risk" t={(k) => k}><p>FORM</p></CreateOption>);
    expect(html).toContain("kind.risk");
    expect(html).toContain("items.create.risk");
    expect(html).toContain("<p>FORM</p>");
  });
});
