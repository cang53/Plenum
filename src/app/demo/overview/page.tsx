import { OverviewView, type OverviewData } from "@/app/app/OverviewView";
import { demoProject, demoSuggestions, demoTasks } from "@/data/demo";
import { initials } from "@/domain/board";
import { calendarCells } from "@/domain/calendar";
import { byPhase, summarize } from "@/domain/overview";
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
  const open = tasks.filter((x) => x.status !== "done" && x.dueDate);
  const weekEnd = iso(Date.parse(today) + 6 * 864e5);
  const stage = (key: "todo" | "in_progress" | "blocked") => {
    const all = open.filter((x) => x.status === key && x.dueDate! <= weekEnd);
    return { key, label: t(`status.${key}`), count: all.length, tasks: all.slice(0, 3).map((x) => ({ id: x.id, title: x.title, href: "/demo/board", chip: t(`priority.${x.priority}`), tone: x.priority === "high" ? "bad" as const : "todo" as const, date: fmt(x.dueDate!), initials: x.ownerName ? initials(x.ownerName) : "" })) };
  };
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
    headline: t("overview.headline.at_risk").replace("{project}", demoProject.name),
    newTaskHref: "/demo/items",
    membersHref: "/demo/messages",
    waiting: demoSuggestions.length,
    nextMilestone: null,
    risks: { open: 0, high: 0 },
    phases: byPhase(tasks).filter((x) => x.phase).map((x) => ({ name: x.phase!, label: t(`status.${x.done === x.total ? "done" : "in_progress"}`), tone: x.done === x.total ? "ok" as const : "info" as const, percent: Math.round((x.done / x.total) * 100), finish: null })),
    week: [stage("todo"), stage("in_progress"), stage("blocked")],
    calendar: { title: new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" }).format(now), prevHref: "#", nextHref: "#", days: ["M", "T", "W", "T", "F", "S", "S"], cells: calendarCells(today.slice(0, 7), today, [], open.map((x) => x.dueDate!)) },
    team: [],
    teamTotal: 0,
    events: [{ text: "Lifting permit approved", dateLabel: fmt(today) }, { text: "Cabinet drawings revision A sent for comments", dateLabel: fmt(iso(Date.parse(today) - 3 * 864e5)) }],
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
