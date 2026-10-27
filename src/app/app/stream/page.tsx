import { cookies } from "next/headers";
import { supabaseServer } from "@/auth/supabase";
import { listLinkedItems, listPendingSuggestions, listPins, listTimelineMessages } from "@/data/live";
import { currentProject, listProjects } from "@/data/projects";
import { demoProject } from "@/data/demo";
import { buildStream, newSince, suggestionsByMessage } from "@/domain/stream";
import { StreamView } from "./StreamView";
import { getLocale, getT } from "@/lib/locale";
import { intlLocale } from "@/lib/messages";

export const dynamic = "force-dynamic";

export default async function StreamPage({ searchParams }: { searchParams: Promise<{ project?: string; after?: string; view?: string; source?: string }> }) {
  const t = await getT();
  const locale = intlLocale[await getLocale()];
  const supabase = await supabaseServer();
  const { project: chosen, after, view, source } = await searchParams;
  const project = currentProject(await listProjects(supabase), chosen);
  if (!project) return <main id="main" className="page"><p>{t("projects.empty")}</p></main>;
  const tz = demoProject.timeZone;
  const { rows, next } = await listTimelineMessages(supabase, project.id, after);
  const only = source === "email" || source === "teams" ? source : undefined;
  const days = buildStream(only ? rows.filter((m) => m.source === only) : rows, new Date().toISOString(), tz);
  const fresh = newSince(rows, (await cookies()).get(`stream-read-${project.id}`)?.value);
  const linked = await listLinkedItems(supabase, project.id, rows.map((m) => m.id));
  const proposed = suggestionsByMessage(await listPendingSuggestions(supabase, project.id));
  const { data: open } = await supabase.from("tasks").select("id, title").eq("project_id", project.id).is("source_message_id", null).neq("status", "done").order("title").limit(50);
  const pins = await listPins(supabase, project.id);
  const pinned = new Set(pins.map((p) => p.messageId));
  const { data: canPin } = await supabase.rpc("can_manage_project", { p: project.id });
  const decisions = view === "decisions";
  const time = new Intl.DateTimeFormat(locale, { timeZone: tz, hour: "2-digit", minute: "2-digit", hour12: false });
  const date = new Intl.DateTimeFormat(locale, { timeZone: tz, weekday: "long", day: "numeric", month: "long" });
  return <StreamView {...{ t, project, rows, days, next, fresh, linked, proposed, open, pins, pinned, canPin: !!canPin, decisions, only, time, date, now: new Date() }} />;
}
