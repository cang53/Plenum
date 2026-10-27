import { cookies } from "next/headers";
import { supabaseServer } from "@/auth/supabase";
import { listLinkedItems, listPendingSuggestions, listPins, listTimelineMessages } from "@/data/live";
import { currentProject, listProjects } from "@/data/projects";
import { demoProject } from "@/data/demo";
import { buildStream, filterFeed, newSince, suggestionsByMessage, type StreamQuery } from "@/domain/stream";
import { StreamView } from "./StreamView";
import { getLocale, getT } from "@/lib/locale";
import { intlLocale } from "@/lib/messages";

export const dynamic = "force-dynamic";

export default async function StreamPage({ searchParams }: { searchParams: Promise<{ project?: string; after?: string; view?: string; source?: string; q?: string; reply?: string }> }) {
  const t = await getT();
  const locale = intlLocale[await getLocale()];
  const supabase = await supabaseServer();
  const { project: chosen, after, view, source, q, reply } = await searchParams;
  const project = currentProject(await listProjects(supabase), chosen);
  if (!project) return <main id="main" className="page"><p>{t("projects.empty")}</p></main>;
  const tz = demoProject.timeZone;
  const { rows, next } = await listTimelineMessages(supabase, project.id, after);
  const readAt = (await cookies()).get(`stream-read-${project.id}`)?.value;
  const query: StreamQuery = { q, source: source === "email" || source === "app" || source === "teams" ? source : undefined };
  const days = buildStream(filterFeed(rows, query), new Date().toISOString(), tz);
  const replyTo = rows.find((m) => m.id === reply) ?? null;
  const fresh = newSince(rows, readAt);
  const linked = await listLinkedItems(supabase, project.id, rows.map((m) => m.id));
  const proposed = suggestionsByMessage(await listPendingSuggestions(supabase, project.id));
  const { data: open } = await supabase.from("tasks").select("id, title").eq("project_id", project.id).is("source_message_id", null).neq("status", "done").order("title").limit(50);
  const pins = await listPins(supabase, project.id);
  const pinned = new Set(pins.map((p) => p.messageId));
  const { data: canPin } = await supabase.rpc("can_manage_project", { p: project.id });
  const decisions = view === "decisions";
  const time = new Intl.DateTimeFormat(locale, { timeZone: tz, hour: "2-digit", minute: "2-digit", hour12: false });
  const date = new Intl.DateTimeFormat(locale, { timeZone: tz, weekday: "long", day: "numeric", month: "long" });
  return <StreamView {...{ t, base: "/app/stream", query, days, reply: replyTo, project, rows, next, fresh, linked, proposed, open, pins, pinned, canPin: !!canPin, decisions, time, date, now: new Date() }} />;
}
