import { OverviewView, type OverviewData } from "@/app/app/OverviewView";
import { demoProject, demoSuggestions, demoTasks } from "@/data/demo";
import { summarize } from "@/domain/overview";
import { getLocale, getT } from "@/lib/locale";
import { intlLocale } from "@/lib/messages";

// Sample Overview: due dates shifted so the sample tasks sit around today, and nothing is stored.
export const dynamic = "force-dynamic";

export default async function DemoOverviewPage() {
  const t = await getT();
  const locale = intlLocale[await getLocale()];
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const shift = Date.parse(today) - Date.parse("2026-10-27");
  const iso = (ms: number) => new Date(ms).toISOString().slice(0, 10);
  const tasks = demoTasks.map((x) => ({ ...x, dueDate: x.dueDate && iso(Date.parse(x.dueDate) + shift - (x.id === "t3" ? 14 * 864e5 : 0)) }));
  const day = new Intl.DateTimeFormat(locale, { day: "numeric", month: "short" });
  const fmt = (d: string) => day.format(new Date(d));
  const pulse = summarize(tasks, today);
  const meta = (x: (typeof tasks)[number]) => [x.ownerName, x.dueDate && fmt(x.dueDate)].filter(Boolean).join(" · ");
  const open = tasks.filter((x) => x.status !== "done" && x.dueDate && x.dueDate >= today).sort((a, b) => a.dueDate!.localeCompare(b.dueDate!));
  const weekEnd = iso(Date.parse(today) + 6 * 864e5);
  const data: OverviewData = {
    projectName: demoProject.name,
    dateLabel: new Intl.DateTimeFormat(locale, { weekday: "long", day: "numeric", month: "long" }).format(now),
    timelineHref: "/demo/gantt",
    reviewHref: "/demo/messages",
    health: { label: t("overview.health.at_risk"), tone: "warn", note: "The gearbox now arrives two weeks late. Install moves back, and the electrical tests follow it. Handover on 18 Dec still holds if the install starts by 7 Dec.", author: "Marta Silva", dateLabel: fmt(today) },
    attention: pulse.attention.map((x) => ({ id: x.id, title: x.title, href: "/demo/messages", chip: x.status === "blocked" ? t("overview.blocked") : t("overview.overdue"), tone: x.status === "blocked" ? "bad" : "warn", meta: meta(x) })),
    suggestion: { title: demoSuggestions[0].title, details: demoSuggestions[0].details, reason: demoSuggestions[0].reason, href: "/demo/messages" },
    percent: pulse.percentDone,
    counts: { done: pulse.counts.done, in_progress: pulse.counts.in_progress, blocked: pulse.counts.blocked, todo: pulse.counts.todo },
    overdue: tasks.filter((x) => x.status !== "done" && x.dueDate && x.dueDate < today).length,
    upcoming: open.slice(0, 5).map((x) => ({ id: x.id, title: x.title, href: "/demo/gantt", day: fmt(x.dueDate!), soon: x.dueDate! <= weekEnd, meta: [t(`status.${x.status}`), x.ownerName].filter(Boolean).join(" · ") })),
    events: [{ text: "Lifting permit approved", dateLabel: fmt(today) }, { text: "Cabinet drawings revision A sent for comments", dateLabel: fmt(iso(Date.parse(today) - 3 * 864e5)) }],
    address: "line4-ghent@in.plenum.example",
  };
  return (
    <main id="main" className="page overview">
      <div className="ov-extra">
        <p className="notice">{t("gantt.demoNotice")}</p>
        <OverviewView t={t} data={data} />
      </div>
    </main>
  );
}
