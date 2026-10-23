// Schedule import: MS Project XML and Primavera P6 XML/XER become phase + task rows with dates.
import type { MessageKey } from "@/lib/messages";

export type PlanRow = { phase: string; title: string; start: string | null; due: string | null };
export type Parsed = { ok: true; rows: PlanRow[] } | { ok: false; error: MessageKey };

export const IMPORT_MAX = 2000;
const NAME_MAX = 200;
const DAY = /^\d{4}-\d{2}-\d{2}$/;

const decode = (s: string) =>
  s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, "&").trim();
const tag = (block: string, name: string) => {
  const m = block.match(new RegExp(`<${name}>([^<]*)</${name}>`));
  return m ? decode(m[1]) : "";
};
const blocks = (xml: string, name: string) =>
  [...xml.matchAll(new RegExp(`<${name}>[\\s\\S]*?</${name}>`, "g"))].map((m) => m[0]);
const day = (s: string | undefined) => {
  const d = (s ?? "").slice(0, 10);
  return DAY.test(d) && !Number.isNaN(Date.parse(d)) ? d : null;
};
const row = (phase: string, title: string, start: string | undefined, due: string | undefined): PlanRow => {
  const s = day(start), d = day(due);
  return { phase, title, start: s && d && s > d ? null : s, due: s && d && s > d ? null : d };
};

type Wbs = { id: string; parent: string; name: string };
type Activity = { wbs: string; title: string; start?: string; due?: string };

// Level 1 under the root WBS is a phase; deeper levels are folded into it.
function fromWbs(wbs: Wbs[], activities: Activity[]): PlanRow[] {
  const byId = new Map(wbs.map((w) => [w.id, w]));
  const phaseOf = (id: string): string => {
    let at = byId.get(id), prev: Wbs | undefined;
    for (let i = 0; at && at.parent && byId.has(at.parent) && i < 100; i++) { prev = at; at = byId.get(at.parent); }
    return prev?.name ?? "";
  };
  return activities.map((a) => row(phaseOf(a.wbs), a.title, a.start, a.due));
}

function parseMsProject(xml: string): PlanRow[] {
  const rows: PlanRow[] = [];
  let phase = "";
  for (const t of blocks(xml, "Task")) {
    const level = Number(tag(t, "OutlineLevel"));
    const name = tag(t, "Name");
    if (!name || !(level >= 1)) continue; // level 0 is the project summary
    if (tag(t, "Summary") === "1") { if (level === 1) phase = name; continue; }
    rows.push(row(phase, name, tag(t, "Start"), tag(t, "Finish")));
  }
  return rows;
}

function parseP6Xml(xml: string): PlanRow[] {
  const wbs = blocks(xml, "WBS").map((b) => ({ id: tag(b, "ObjectId"), parent: tag(b, "ParentObjectId"), name: tag(b, "Name") }));
  const acts = blocks(xml, "Activity").map((b) => ({
    wbs: tag(b, "WBSObjectId"), title: tag(b, "Name"),
    start: tag(b, "StartDate") || tag(b, "PlannedStartDate"), due: tag(b, "FinishDate") || tag(b, "PlannedFinishDate"),
  }));
  return fromWbs(wbs, acts);
}

// XER is tab separated: %T table name, %F field names, %R one row.
function parseXer(text: string): PlanRow[] {
  const tables: Record<string, Record<string, string>[]> = {};
  let name = "", fields: string[] = [];
  for (const line of text.split(/\r?\n/)) {
    const [kind, ...cells] = line.split("\t");
    if (kind === "%T") { name = cells[0]; tables[name] = []; }
    else if (kind === "%F") fields = cells;
    else if (kind === "%R" && name) tables[name].push(Object.fromEntries(fields.map((f, i) => [f, cells[i] ?? ""])));
  }
  const wbs = (tables.PROJWBS ?? []).map((r) => ({ id: r.wbs_id, parent: r.parent_wbs_id, name: r.wbs_name }));
  const acts = (tables.TASK ?? []).map((r) => ({ wbs: r.wbs_id, title: r.task_name, start: r.target_start_date, due: r.target_end_date }));
  return fromWbs(wbs, acts);
}

export function parsePlan(text: string): Parsed {
  const head = text.slice(0, 2000);
  let rows: PlanRow[];
  if (/^\s*ERMHDR/.test(head)) rows = parseXer(text);
  else if (/schemas\.microsoft\.com\/project/.test(head) || /<Project[\s>]/.test(head) && /<OutlineLevel>/.test(text)) rows = parseMsProject(text);
  else if (/<Activity>/.test(text)) rows = parseP6Xml(text);
  else return { ok: false, error: "import.unknownFormat" };
  rows = rows.filter((r) => r.title).map((r) => ({ ...r, title: r.title.slice(0, NAME_MAX), phase: r.phase.slice(0, NAME_MAX) }));
  if (!rows.length) return { ok: false, error: "import.empty" };
  if (rows.length > IMPORT_MAX) return { ok: false, error: "import.tooBig" };
  return { ok: true, rows };
}

// The preview travels through the browser, so the apply step checks it again.
export function checkRows(raw: unknown): PlanRow[] | null {
  if (!Array.isArray(raw) || !raw.length || raw.length > IMPORT_MAX) return null;
  const rows: PlanRow[] = [];
  for (const r of raw) {
    const ok = r && typeof r.title === "string" && r.title.trim() && r.title.length <= NAME_MAX
      && typeof r.phase === "string" && r.phase.length <= NAME_MAX
      && [r.start, r.due].every((d) => d === null || (typeof d === "string" && DAY.test(d)));
    if (!ok || (r.start && r.due && r.start > r.due)) return null;
    rows.push({ phase: r.phase, title: r.title, start: r.start, due: r.due });
  }
  return rows;
}

export type ExistingTask = { id: string; title: string; phase: string; start: string | null; due: string | null };
export type Plan = { create: PlanRow[]; refresh: { id: string; start: string | null; due: string | null }[]; unchanged: number };

const key = (phase: string, title: string) => `${phase.trim().toLowerCase()}|${title.trim().toLowerCase()}`;

// Tasks match by phase and title; a refresh sets dates only, so owners, status and links stay.
export function planChanges(rows: PlanRow[], existing: ExistingTask[]): Plan {
  const have = new Map(existing.map((t) => [key(t.phase, t.title), t]));
  const plan: Plan = { create: [], refresh: [], unchanged: 0 };
  const seen = new Set<string>();
  for (const r of rows) {
    const k = key(r.phase, r.title);
    if (seen.has(k)) continue;
    seen.add(k);
    const t = have.get(k);
    if (!t) plan.create.push(r);
    else if (t.start === r.start && t.due === r.due) plan.unchanged++;
    else plan.refresh.push({ id: t.id, start: r.start, due: r.due });
  }
  return plan;
}
