// Resource import: MS Project / P6 resources and assignments become task owners.
// Only name and email are read from a resource; cost rates and units are never looked at.
import type { MessageKey } from "@/lib/messages";

export type Resource = { id: string; name: string; email: string };
export type Assignment = { task: string; resource: string };
export type ResourceData = { resources: Resource[]; assignments: Assignment[] };
export type ParsedResources = ({ ok: true } & ResourceData) | { ok: false; error: MessageKey };

export const RESOURCE_MAX = 2000;
const TEXT_MAX = 200;

const decode = (s: string) =>
  s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, "&").trim();
const tag = (block: string, name: string) => {
  const m = block.match(new RegExp(`<${name}>([^<]*)</${name}>`));
  return m ? decode(m[1]) : "";
};
const blocks = (xml: string, name: string) =>
  [...xml.matchAll(new RegExp(`<${name}>[\\s\\S]*?</${name}>`, "g"))].map((m) => m[0]);

type Raw = { resources: Resource[]; tasks: Map<string, string>; links: { task: string; resource: string }[] };

function fromXml(xml: string, f: { task: string; res: string; asg: string; asgTask: string; asgRes: string; taskName: string; id: string }): Raw {
  const tasks = new Map(blocks(xml, f.task).map((b) => [tag(b, f.id), tag(b, f.taskName)] as const));
  const resources = blocks(xml, f.res).map((b) => ({ id: tag(b, f.id), name: tag(b, "Name"), email: tag(b, "EmailAddress") }));
  const links = blocks(xml, f.asg).map((b) => ({ task: tag(b, f.asgTask), resource: tag(b, f.asgRes) }));
  return { resources, tasks, links };
}

// XER is tab separated: %T table name, %F field names, %R one row.
function fromXer(text: string): Raw {
  const tables: Record<string, Record<string, string>[]> = {};
  let name = "", fields: string[] = [];
  for (const line of text.split(/\r?\n/)) {
    const [kind, ...cells] = line.split("\t");
    if (kind === "%T") { name = cells[0]; tables[name] = []; }
    else if (kind === "%F") fields = cells;
    else if (kind === "%R" && name) tables[name].push(Object.fromEntries(fields.map((f, i) => [f, cells[i] ?? ""])));
  }
  return {
    resources: (tables.RSRC ?? []).map((r) => ({ id: r.rsrc_id, name: r.rsrc_name, email: r.email_addr })),
    tasks: new Map((tables.TASK ?? []).map((r) => [r.task_id, r.task_name] as const)),
    links: (tables.TASKRSRC ?? []).map((r) => ({ task: r.task_id, resource: r.rsrc_id })),
  };
}

export function parseResources(text: string): ParsedResources {
  const head = text.slice(0, 2000);
  let raw: Raw;
  if (/^\s*ERMHDR/.test(head)) raw = fromXer(text);
  else if (/schemas\.microsoft\.com\/project/.test(head) || /<Project[\s>]/.test(head) && /<OutlineLevel>/.test(text))
    raw = fromXml(text, { task: "Task", res: "Resource", asg: "Assignment", asgTask: "TaskUID", asgRes: "ResourceUID", taskName: "Name", id: "UID" });
  else if (/<Activity>/.test(text))
    raw = fromXml(text, { task: "Activity", res: "Resource", asg: "ResourceAssignment", asgTask: "ActivityObjectId", asgRes: "ResourceObjectId", taskName: "Name", id: "ObjectId" });
  else return { ok: false, error: "import.unknownFormat" };
  const resources = raw.resources
    .filter((r) => r.id && r.name)
    .map((r) => ({ id: r.id, name: r.name.slice(0, TEXT_MAX), email: r.email.slice(0, TEXT_MAX) }));
  const known = new Set(resources.map((r) => r.id));
  const assignments = raw.links.flatMap((l) => {
    const task = raw.tasks.get(l.task);
    return task && known.has(l.resource) ? [{ task: task.slice(0, TEXT_MAX), resource: l.resource }] : [];
  });
  if (!resources.length) return { ok: false, error: "resources.empty" };
  if (resources.length > RESOURCE_MAX || assignments.length > RESOURCE_MAX * 10) return { ok: false, error: "import.tooBig" };
  return { ok: true, resources, assignments };
}

// The preview travels through the browser, so the apply step checks it again.
export function checkResourceData(raw: unknown): ResourceData | null {
  const d = raw as ResourceData | null;
  const str = (v: unknown) => typeof v === "string" && v.length <= TEXT_MAX;
  if (!d || !Array.isArray(d.resources) || !Array.isArray(d.assignments)) return null;
  if (d.resources.length > RESOURCE_MAX || d.assignments.length > RESOURCE_MAX * 10) return null;
  if (!d.resources.every((r) => r && str(r.id) && r.id && str(r.name) && str(r.email))) return null;
  if (!d.assignments.every((a) => a && str(a.task) && str(a.resource))) return null;
  return { resources: d.resources.map((r) => ({ id: r.id, name: r.name, email: r.email })), assignments: d.assignments.map((a) => ({ task: a.task, resource: a.resource })) };
}

export type PersonRef = { userId: string; email: string };
export type TaskRef = { id: string; title: string; ownerId: string | null };
export type OwnerPlan = {
  set: { id: string; ownerId: string }[];
  unchanged: number;
  skipped: number;
  unmatched: Resource[];
};

const norm = (s: string) => s.trim().toLowerCase();

// A resource is matched by email; otherwise a manager's pick (resource id -> member) decides.
// A task takes its first resolved resource, and an existing different owner is never replaced.
export function planOwners(data: ResourceData, tasks: TaskRef[], members: PersonRef[], picks: Record<string, string> = {}): OwnerPlan {
  const byEmail = new Map(members.map((m) => [norm(m.email), m.userId]));
  const isMember = new Set(members.map((m) => m.userId));
  const who = new Map<string, string>();
  for (const r of data.resources) {
    const id = (r.email && byEmail.get(norm(r.email))) || (isMember.has(picks[r.id]) ? picks[r.id] : undefined);
    if (id) who.set(r.id, id);
  }
  const byTitle = new Map<string, TaskRef[]>();
  for (const t of tasks) byTitle.set(norm(t.title), [...(byTitle.get(norm(t.title)) ?? []), t]);
  const plan: OwnerPlan = { set: [], unchanged: 0, skipped: 0, unmatched: data.resources.filter((r) => !who.has(r.id)) };
  const done = new Set<string>();
  for (const a of data.assignments) {
    const found = byTitle.get(norm(a.task)) ?? [];
    const owner = who.get(a.resource);
    if (found.length !== 1 || !owner) { plan.skipped++; continue; }
    const t = found[0];
    if (done.has(t.id)) continue;
    done.add(t.id);
    if (t.ownerId === owner) plan.unchanged++;
    else if (t.ownerId) plan.skipped++;
    else plan.set.push({ id: t.id, ownerId: owner });
  }
  return plan;
}
