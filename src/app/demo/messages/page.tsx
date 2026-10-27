import { StreamView } from "@/app/app/stream/StreamView";
import { demoMessages, demoProject, demoSuggestions } from "@/data/demo";
import { buildStream, suggestionsByMessage } from "@/domain/stream";
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

export default async function DemoMessagesPage() {
  const t = await getT();
  const locale = intlLocale[await getLocale()];
  const now = new Date();
  const tz = demoProject.timeZone;
  const rows: TimelineMessage[] = demoMessages(now);
  const pinnedMessage = rows.find((m) => m.id === "m2")!;
  const time = new Intl.DateTimeFormat(locale, { timeZone: tz, hour: "2-digit", minute: "2-digit", hour12: false });
  const date = new Intl.DateTimeFormat(locale, { timeZone: tz, weekday: "long", day: "numeric", month: "long" });
  return (
    <StreamView
      t={t}
      project={{ id: "demo", name: demoProject.name }}
      rows={rows}
      days={buildStream(rows, now.toISOString(), tz)}
      next={null}
      fresh={{ id: "m2", count: 2 }}
      linked={[{ id: "l1", messageId: "m3", kind: "task", title: "Send updated cabinet drawings to Aylin" }]}
      proposed={suggestionsByMessage([...demoSuggestions, ...extraSuggestions])}
      open={null}
      pins={[{ messageId: "m2", pinnedAt: now.toISOString(), pinnedBy: "Maya de Vries", message: pinnedMessage }]}
      pinned={new Set(["m2"])}
      canPin={false}
      decisions={false}
      only={undefined}
      time={time}
      date={date}
      now={now}
      readOnly
    />
  );
}
