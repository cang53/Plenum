import { describe, expect, it } from "vitest";
import { checkResourceData, parseResources, planOwners } from "./resourceImport";

const msp = `<?xml version="1.0"?><Project xmlns="http://schemas.microsoft.com/project"><Tasks>
<Task><UID>1</UID><Name>Pour slab</Name><OutlineLevel>1</OutlineLevel></Task>
<Task><UID>2</UID><Name>Fit doors</Name><OutlineLevel>1</OutlineLevel></Task></Tasks>
<Resources><Resource><UID>0</UID><Name></Name></Resource>
<Resource><UID>5</UID><Name>Ann &amp; Co</Name><EmailAddress>Ann@Site.test</EmailAddress><StandardRate>99</StandardRate></Resource>
<Resource><UID>6</UID><Name>Bo</Name></Resource></Resources>
<Assignments><Assignment><TaskUID>1</TaskUID><ResourceUID>5</ResourceUID><Cost>5000</Cost></Assignment>
<Assignment><TaskUID>2</TaskUID><ResourceUID>6</ResourceUID></Assignment></Assignments></Project>`;

const p6 = `<APIBusinessObjects><Resource><ObjectId>9</ObjectId><Name>Cy</Name><EmailAddress>cy@x.test</EmailAddress></Resource>
<Activity><ObjectId>3</ObjectId><Name>Paint</Name></Activity>
<ResourceAssignment><ActivityObjectId>3</ActivityObjectId><ResourceObjectId>9</ResourceObjectId></ResourceAssignment></APIBusinessObjects>`;

const xer = ["ERMHDR\t8", "%T\tRSRC", "%F\trsrc_id\trsrc_name\temail_addr\tcost_qty_link_flag", "%R\t4\tDi\tdi@x.test\tY",
  "%T\tTASK", "%F\ttask_id\ttask_name", "%R\t7\tWeld", "%T\tTASKRSRC", "%F\ttask_id\trsrc_id", "%R\t7\t4"].join("\n");

describe("parseResources", () => {
  it("reads MS Project resources and assignments, skipping the blank placeholder", () => {
    const r = parseResources(msp);
    expect(r).toEqual({
      ok: true,
      resources: [{ id: "5", name: "Ann & Co", email: "Ann@Site.test" }, { id: "6", name: "Bo", email: "" }],
      assignments: [{ task: "Pour slab", resource: "5" }, { task: "Fit doors", resource: "6" }],
    });
  });
  it("never carries cost rates", () => {
    expect(JSON.stringify(parseResources(msp))).not.toMatch(/99|5000/);
  });
  it("reads P6 XML and XER", () => {
    expect(parseResources(p6)).toMatchObject({ ok: true, assignments: [{ task: "Paint", resource: "9" }] });
    expect(parseResources(xer)).toMatchObject({ ok: true, resources: [{ name: "Di", email: "di@x.test" }], assignments: [{ task: "Weld", resource: "4" }] });
  });
  it("refuses unknown and resource-less files", () => {
    expect(parseResources("hello")).toEqual({ ok: false, error: "import.unknownFormat" });
    expect(parseResources("<Activity></Activity>")).toEqual({ ok: false, error: "resources.empty" });
  });
});

describe("checkResourceData", () => {
  it("accepts parsed data and rejects tampering", () => {
    const d = { resources: [{ id: "1", name: "A", email: "" }], assignments: [{ task: "T", resource: "1" }] };
    expect(checkResourceData(d)).toEqual(d);
    expect(checkResourceData({ ...d, resources: [{ id: 1, name: "A", email: "" }] })).toBeNull();
    expect(checkResourceData({ resources: [], assignments: [{ task: "x".repeat(300), resource: "1" }] })).toBeNull();
    expect(checkResourceData(null)).toBeNull();
  });
});

describe("planOwners", () => {
  const data = parseResources(msp) as Extract<ReturnType<typeof parseResources>, { ok: true }>;
  const members = [{ userId: "u-ann", email: "ann@site.test" }, { userId: "u-bo", email: "bo@site.test" }];
  const tasks = [{ id: "t1", title: "pour slab", ownerId: null }, { id: "t2", title: "Fit doors", ownerId: null }];

  it("matches by email ignoring case and lists the rest as unmatched", () => {
    const plan = planOwners(data, tasks, members);
    expect(plan.set).toEqual([{ id: "t1", ownerId: "u-ann" }]);
    expect(plan.unmatched.map((r) => r.name)).toEqual(["Bo"]);
    expect(plan.skipped).toBe(1);
  });
  it("uses a pick for an unmatched resource, but only for a real member", () => {
    expect(planOwners(data, tasks, members, { "6": "u-bo" }).set).toContainEqual({ id: "t2", ownerId: "u-bo" });
    expect(planOwners(data, tasks, members, { "6": "stranger" }).set).toHaveLength(1);
  });
  it("keeps an existing owner and skips ambiguous or missing tasks", () => {
    const owned = [{ id: "t1", title: "Pour slab", ownerId: "someone" }, { id: "t2", title: "Fit doors", ownerId: "u-bo" }, { id: "t3", title: "Fit doors", ownerId: null }];
    const plan = planOwners(data, owned, members, { "6": "u-bo" });
    expect(plan.set).toEqual([]);
    expect(plan.skipped).toBe(2);
  });
  it("counts a task that already has the right owner as unchanged", () => {
    expect(planOwners(data, [{ id: "t1", title: "Pour slab", ownerId: "u-ann" }], members).unchanged).toBe(1);
  });
});
