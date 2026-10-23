// Schedule import: MS Project XML and Primavera P6 XML/XER become phase + task rows with dates.
import type { MessageKey } from "@/lib/messages";

export type PlanRow = { phase: string; title: string; start: string | null; due: string | null };
export type Kind = "FS" | "SS" | "FF" | "SF";
// from and to are positions in rows; lag is in working days (8-hour days).
export type Link = { from: number; to: number; kind: Kind; lag: number };
export type Skipped = { reason: "type" | "lag" | "task"; from: string; to: string };
export type Parsed = { ok: true; rows: PlanRow[]; links: Link[]; skipped: Skipped[] } | { ok: false; error: MessageKey };

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
type Activity = { wbs: string; title: string; start?: string; due?: string; ref?: string };
// A link as written in the file: refs are the file's own task ids; kind and lag are left unchecked.
type RawLink = { pred: string; succ: string; kind: string; lag: number | null };
type Raw = { rows: (PlanRow & { ref: string })[]; links: RawLink[] };

const KINDS: Record<string, Kind> = { FS: "FS", SS: "SS", FF: "FF", SF: "SF", PR_FS: "FS", PR_SS: "SS", PR_FF: "FF", PR_SF: "SF",
  "Finish to Start": "FS", "Start to Start": "SS", "Finish to Finish": "FF", "Start to Finish": "SF" };
const MSP_KINDS = ["FF", "FS", "SF", "SS"];
const days = (n: number) => Math.round(n);

// Level 1 under the root WBS is a phase; deeper levels are folded into it.
function fromWbs(wbs: Wbs[], activities: Activity[]): (PlanRow & { ref: string })[] {
  const byId = new Map(wbs.map((w) => [w.id, w]));
  const phaseOf = (id: string): string => {
    let at = byId.get(id), prev: Wbs | undefined;
    for (let i = 0; at && at.parent && byId.has(at.parent) && i < 100; i++) { prev = at; at = byId.get(at.parent); }
    return prev?.name ?? "";
  };
  return activities.map((a) => ({ ...row(phaseOf(a.wbs), a.title, a.start, a.due), ref: a.ref ?? "" }));
}

// MS Project: type 0 FF, 1 FS, 2 SF, 3 SS; the lag is in tenths of a minute, so 4800 is one 8-hour day.
function parseMsProject(xml: string): Raw {
  const rows: Raw["rows"] = [];
  const links: RawLink[] = [];
  let phase = "";
  for (const t of blocks(xml, "Task")) {
    const level = Number(tag(t, "OutlineLevel"));
    const name = tag(t, "Name");
    if (!name || !(level >= 1)) continue; // level 0 is the project summary
    const ref = tag(t, "UID");
    for (const l of blocks(t, "PredecessorLink")) {
      const format = Number(tag(l, "LagFormat") || 7);
      links.push({ pred: tag(l, "PredecessorUID"), succ: ref, kind: MSP_KINDS[Number(tag(l, "Type") || 1)] ?? "?",
        lag: format >= 3 && format <= 12 ? days(Number(tag(l, "LinkLag") || 0) / 4800) : null });
    }
    if (tag(t, "Summary") === "1") { if (level === 1) phase = name; continue; }
    rows.push({ ...row(phase, name, tag(t, "Start"), tag(t, "Finish")), ref });
  }
  return { rows, links };
}

function parseP6Xml(xml: string): Raw {
  const wbs = blocks(xml, "WBS").map((b) => ({ id: tag(b, "ObjectId"), parent: tag(b, "ParentObjectId"), name: tag(b, "Name") }));
  const acts = blocks(xml, "Activity").map((b) => ({
    wbs: tag(b, "WBSObjectId"), title: tag(b, "Name"), ref: tag(b, "ObjectId"),
    start: tag(b, "StartDate") || tag(b, "PlannedStartDate"), due: tag(b, "FinishDate") || tag(b, "PlannedFinishDate"),
  }));
  const links = blocks(xml, "Relationship").map((b) => ({
    pred: tag(b, "PredecessorActivityObjectId"), succ: tag(b, "SuccessorActivityObjectId"), kind: tag(b, "Type"), lag: days(Number(tag(b, "Lag") || 0) / 8),
  }));
  return { rows: fromWbs(wbs, acts), links };
}

// XER is tab separated: %T table name, %F field names, %R one row.
function parseXer(text: string): Raw {
  const tables: Record<string, Record<string, string>[]> = {};
  let name = "", fields: string[] = [];
  for (const line of text.split(/\r?\n/)) {
    const [kind, ...cells] = line.split("\t");
    if (kind === "%T") { name = cells[0]; tables[name] = []; }
    else if (kind === "%F") fields = cells;
    else if (kind === "%R" && name) tables[name].push(Object.fromEntries(fields.map((f, i) => [f, cells[i] ?? ""])));
  }
  const wbs = (tables.PROJWBS ?? []).map((r) => ({ id: r.wbs_id, parent: r.parent_wbs_id, name: r.wbs_name }));
  const acts = (tables.TASK ?? []).map((r) => ({ wbs: r.wbs_id, title: r.task_name, start: r.target_start_date, due: r.target_end_date, ref: r.task_id }));
  const links = (tables.TASKPRED ?? []).map((r) => ({ pred: r.pred_task_id, succ: r.task_id, kind: r.pred_type, lag: days(Number(r.lag_hr_cnt || 0) / 8) }));
  return { rows: fromWbs(wbs, acts), links };
}

// Links the file does not describe as one of the four types, or whose tasks are not imported, are listed, not dropped silently.
function resolveLinks(raw: Raw): { links: Link[]; skipped: Skipped[] } | null {
  const index = new Map<string, number>();
  raw.rows.forEach((r, i) => r.ref && index.set(r.ref, i));
  const name = (ref: string) => raw.rows[index.get(ref) ?? -1]?.title ?? ref;
  const links = new Map<string, Link>();
  const skipped: Skipped[] = [];
  for (const l of raw.links) {
    const from = index.get(l.pred), to = index.get(l.succ), kind = KINDS[l.kind];
    const miss = (reason: Skipped["reason"]) => skipped.push({ reason, from: name(l.pred), to: name(l.succ) });
    if (from === undefined || to === undefined || from === to) miss("task");
    else if (!kind) miss("type");
    else if (l.lag === null || Math.abs(l.lag) > 3650) miss("lag");
    else links.set(`${from}>${to}`, { from, to, kind, lag: l.lag });
  }
  const all = [...links.values()];
  return hasLoop(all) ? null : { links: all, skipped };
}

function hasLoop(links: Pick<Link, "from" | "to">[]): boolean {
  const next = new Map<number, number[]>();
  for (const l of links) next.set(l.from, [...(next.get(l.from) ?? []), l.to]);
  const state = new Map<number, 1 | 2>();
  const visit = (n: number): boolean => {
    if (state.get(n) === 1) return true;
    if (state.get(n) === 2) return false;
    state.set(n, 1);
    const loop = (next.get(n) ?? []).some(visit);
    state.set(n, 2);
    return loop;
  };
  return [...next.keys()].some(visit);
}

export function parsePlan(text: string): Parsed {
  const head = text.slice(0, 2000);
  let raw: Raw;
  if (/^\s*ERMHDR/.test(head)) raw = parseXer(text);
  else if (/schemas\.microsoft\.com\/project/.test(head) || /<Project[\s>]/.test(head) && /<OutlineLevel>/.test(text)) raw = parseMsProject(text);
  else if (/<Activity>/.test(text)) raw = parseP6Xml(text);
  else return { ok: false, error: "import.unknownFormat" };
  // Rows without a title are dropped, so links are resolved first against the rows that stay.
  raw.rows = raw.rows.filter((r) => r.title).map((r) => ({ ...r, title: r.title.slice(0, NAME_MAX), phase: r.phase.slice(0, NAME_MAX) }));
  if (!raw.rows.length) return { ok: false, error: "import.empty" };
  if (raw.rows.length > IMPORT_MAX) return { ok: false, error: "import.tooBig" };
  const resolved = resolveLinks(raw);
  if (!resolved) return { ok: false, error: "import.cycle" };
  return { ok: true, rows: raw.rows.map(({ phase, title, start, due }) => ({ phase, title, start, due })), ...resolved };
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

export function checkLinks(raw: unknown, rowCount: number): Link[] | null {
  if (!Array.isArray(raw) || raw.length > IMPORT_MAX * 10) return null;
  const int = (n: unknown) => Number.isInteger(n) && (n as number) >= 0 && (n as number) < rowCount;
  const links: Link[] = [];
  for (const l of raw) {
    const ok = l && int(l.from) && int(l.to) && l.from !== l.to && ["FS", "SS", "FF", "SF"].includes(l.kind)
      && Number.isInteger(l.lag) && Math.abs(l.lag) <= 3650;
    if (!ok) return null;
    links.push({ from: l.from, to: l.to, kind: l.kind, lag: l.lag });
  }
  return hasLoop(links) ? null : links;
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
