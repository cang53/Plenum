import { pagesParam } from "@/domain/paging";
import { StreamView } from "@/app/app/stream/StreamView";
import { demoMessages, demoProject, demoSuggestions } from "@/data/demo";
import { buildStream, filterFeed, suggestionsByMessage, type StreamQuery } from "@/domain/stream";
import type { StoredSuggestion } from "@/domain/triage";
import type { TimelineMessage } from "@/domain/timeline";
import { getLocale, getT } from "@/lib/locale";
import { intlLocale } from "@/lib/messages";

// Sample messages, AI suggestions and a pinned decision, dated from now, so every kind of card can be seen. Nothing is stored.
export const dynamic = "force-dynamic";

const extraSuggestions: StoredSuggestion[] = [
  { id: "s3", messageId: "m2", status: "pending", kind: "decision", title: "Start lifting on Monday", details: "The lifting permit is approved, so the crane work can start on Monday.", reason: "Jonas confirms the permit." },
  { id: "s4", messageId: "m4", status: "pending", kind: "risk", title: "Load chart may not match the final gearbox weight", details: "The crane load chart on page 4 has not been checked against the supplier's final weight. A mismatch could stop the lift on the day.", reason: "Jonas asks for the check before Friday." },
];

// Sample pictures drawn in place, so the demo needs no files.
const pic = "data:image/svg+xml," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="480" height="300"><rect width="480" height="300" fill="#dbe4f5"/><rect y="200" width="480" height="100" fill="#8fa3c4"/><path d="M90 200V70h14v130zM90 70h210v12H90zM285 82v70" stroke="#3b5bdb" stroke-width="8" fill="none"/><rect x="262" y="150" width="46" height="34" fill="#3b5bdb"/></svg>');

export default async function DemoMessagesPage({ searchParams }: { searchParams: Promise<{ q?: string; source?: string; view?: string; unread?: string; pages?: string }> }) {
  const { q, source, view, unread, pages: pagesRaw } = await searchParams;
  const pages = Math.min(pagesParam(pagesRaw), 3);
  const t = await getT();
  const locale = intlLocale[await getLocale()];
  const now = new Date();
  const tz = demoProject.timeZone;
  const base: TimelineMessage[] = demoMessages(now);
  // Each extra page adds a copy of the sample messages from earlier days, so "load older in place" can be tried without a database.
  const older = Array.from({ length: pages - 1 }, (_, i) => base.map((m) => ({ ...m, id: `${m.id}-p${i + 2}`, receivedAt: new Date(Date.parse(m.receivedAt) - (i + 2) * 7 * 864e5).toISOString() }))).flat();
  const rows: TimelineMessage[] = [...base, ...older];
  const pinnedMessage = rows.find((m) => m.id === "m2")!;
  const query: StreamQuery = { q, source: source === "email" || source === "app" || source === "teams" ? source : undefined };
  const days = buildStream(filterFeed(rows, query), now.toISOString(), tz);
  const time = new Intl.DateTimeFormat(locale, { timeZone: tz, hour: "2-digit", minute: "2-digit", hour12: false });
  const date = new Intl.DateTimeFormat(locale, { timeZone: tz, weekday: "long", day: "numeric", month: "long" });
  return (
    <StreamView
      t={t}
      project={{ id: "demo", name: demoProject.name }}
      base="/demo/messages"
      days={days}
      query={query}
      next={pages < 3 ? "more" : null}
      pages={pages}
      fresh={unread === "0" ? null : { id: "m1", count: 3 }}
      linked={[{ id: "l1", messageId: "m3", kind: "task", title: "Send updated cabinet drawings to Aylin" }]}
      fileUrls={new Map([["a4", pic], ["a5", "#"]])}
      proposed={suggestionsByMessage([...demoSuggestions, ...extraSuggestions])}
      actions={[
        { id: "a1", messageId: "m4", kind: "update_task", title: "Pour slab", details: "New finish date 2026-11-13.", startDate: "2026-11-09", dueDate: "2026-11-13", reason: 'The note says "Move pour slab to 13 November".', before: { startDate: "2026-11-02", dueDate: "2026-11-06" } },
        { id: "a3", messageId: "m4", kind: "add_dependency", title: "Install control cabinet after Install conveyor modules", details: "The cabinet cannot start before the conveyor modules are installed.", startDate: null, dueDate: null, reason: "The note links the two tasks.", before: null, accepted: { by: "Maya de Vries", at: now.toISOString() } },
        { id: "a4", messageId: "m4", kind: "update_task", title: "Install conveyor modules", details: "New finish date 2026-11-20.", startDate: "2026-11-09", dueDate: "2026-11-20", reason: "The note says the install slips to 20 November.", before: { startDate: "2026-11-09", dueDate: "2026-11-16" }, accepted: { by: "Maya de Vries", at: now.toISOString() } },
        { id: "a2", messageId: "m4", kind: "create_task", title: "Order rebar", details: "", startDate: "2026-11-12", dueDate: "2026-11-12", reason: 'The note says "Action: Order rebar by 12 Nov".', before: null },
      ]}
      open={null}
      pins={[{ messageId: "m2", pinnedAt: now.toISOString(), pinnedBy: "Maya de Vries", message: pinnedMessage }]}
      pinned={new Set(["m2"])}
      canPin={false}
      decisions={view === "decisions"}
      time={time}
      date={date}
      now={now}
      readOnly
      me="maya@plenum.example"
    />
  );
}
