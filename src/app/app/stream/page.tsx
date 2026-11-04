import { cookies } from "next/headers";
import { supabaseServer } from "@/auth/supabase";
import { listLinkedItems, listPendingSuggestions, listPins, listTimelineMessages } from "@/data/live";
import { currentProject, listMembers, listProjects } from "@/data/projects";
import { demoProject } from "@/data/demo";
import { buildStream, filterFeed, newSince, suggestionsByMessage, type StreamQuery } from "@/domain/stream";
import type { AgentProposal } from "@/domain/agent";
import { groupReactions } from "@/domain/reactions";
import type { MentionItem } from "@/domain/mentions";
import { StreamView } from "./StreamView";
import { getLocale, getT } from "@/lib/locale";
import { intlLocale } from "@/lib/messages";

export const dynamic = "force-dynamic";
// The agent runs after the send has answered, so it still needs time.
export const maxDuration = 60;

export default async function StreamPage({ searchParams }: { searchParams: Promise<{ project?: string; after?: string; view?: string; source?: string; q?: string }> }) {
  const t = await getT();
  const locale = intlLocale[await getLocale()];
  const supabase = await supabaseServer();
  const { project: chosen, after, view, source, q } = await searchParams;
  const project = currentProject(await listProjects(supabase), chosen);
  if (!project) return <main id="main" className="page"><p>{t("projects.empty")}</p></main>;
  const me = (await supabase.auth.getUser()).data.user?.email ?? undefined;
  const tz = demoProject.timeZone;
  const { rows, next } = await listTimelineMessages(supabase, project.id, after);
  const readAt = (await cookies()).get(`stream-read-${project.id}`)?.value;
  const query: StreamQuery = { q, source: source === "email" || source === "app" || source === "teams" ? source : undefined };
  const days = buildStream(filterFeed(rows, query), new Date().toISOString(), tz);
  const fresh = newSince(rows, readAt);
  const linked = await listLinkedItems(supabase, project.id, rows.map((m) => m.id));
  const proposed = suggestionsByMessage(await listPendingSuggestions(supabase, project.id));
  const { data: open } = await supabase.from("tasks").select("id, title").eq("project_id", project.id).is("source_message_id", null).neq("status", "done").order("title").limit(50);
  // Files written in Plenum are in a private bucket; each gets a link that works for an hour. Quietly none until the storage migration is applied.
  const { data: stored } = await supabase.from("message_attachments").select("id, storage_path").in("message_id", rows.map((m) => m.id)).not("storage_path", "is", null);
  const signed = stored?.length ? (await supabase.storage.from("message-files").createSignedUrls(stored.map((r) => r.storage_path as string), 3600)).data ?? [] : [];
  const fileUrls = new Map((stored ?? []).flatMap((r) => { const u = signed.find((x) => x.path === r.storage_path)?.signedUrl; return u ? [[r.id as string, u] as const] : []; }));
  // Quietly none until the agent migration is applied.
  const { data: pending } = await supabase.from("agent_actions").select("id, message_id, kind, title, details, start_date, due_date, reason, status, resolved_at, resolved_by_name, prev_start_date, prev_due_date, tasks:task_id(start_date, due_date)").eq("project_id", project.id).in("status", ["pending", "accepted"]).order("created_at");
  const actions: AgentProposal[] = (pending ?? []).map((a) => {
    const task = a.tasks as unknown as { start_date: string | null; due_date: string | null } | null;
    return { id: a.id, messageId: a.message_id, kind: a.kind, title: a.title, details: a.details, startDate: a.start_date, dueDate: a.due_date, reason: a.reason, before: a.status === "accepted" ? (a.kind === "update_task" ? { startDate: a.prev_start_date, dueDate: a.prev_due_date } : null) : task ? { startDate: task.start_date, dueDate: task.due_date } : null, accepted: a.status === "accepted" ? { by: a.resolved_by_name ?? "", at: a.resolved_at } : null };
  });
  // Quietly none until the reactions migration is applied.
  const { data: reacted } = await supabase.from("message_reactions").select("message_id, emoji, user_id, agent").in("message_id", rows.map((m) => m.id));
  const myId = (await supabase.auth.getUser()).data.user?.id;
  const reactions = groupReactions(reacted ?? [], myId);
  // What the "@" picker offers: people, CobIA, then the project's open items and files. Quietly fewer where a table cannot be read.
  const [people, tasks, risks, decs, files] = await Promise.all([
    listMembers(supabase, project.id).catch(() => []),
    supabase.from("tasks").select("id, title").eq("project_id", project.id).neq("status", "done").order("title").limit(100),
    supabase.from("risks").select("id, title, kind").eq("project_id", project.id).eq("status", "open").order("title").limit(100),
    supabase.from("decisions").select("id, title").eq("project_id", project.id).order("created_at", { ascending: false }).limit(100),
    supabase.from("library_documents").select("id, title").eq("project_id", project.id).order("title").limit(100),
  ]);
  const base = `?project=${project.id}`;
  const mentions: MentionItem[] = [
    ...people.map((m) => ({ id: m.userId, type: "person" as const, label: m.name || m.email, href: `/app/members${base}` })),
    { id: "cobia", type: "agent", label: t("stream.agent.name"), href: `/app/stream${base}` },
    ...(tasks.data ?? []).map((r) => ({ id: r.id, type: "task" as const, label: r.title, href: `/app/tasks/${r.id}` })),
    ...(risks.data ?? []).map((r) => ({ id: r.id, type: r.kind === "issue" ? "issue" as const : "risk" as const, label: r.title, href: `/app/risks/${r.id}` })),
    ...(decs.data ?? []).map((r) => ({ id: r.id, type: "decision" as const, label: r.title, href: `/app/stream${base}&view=decisions` })),
    ...(files.data ?? []).map((r) => ({ id: r.id, type: "file" as const, label: r.title, href: `/app/library${base}` })),
  ];
  const pins = await listPins(supabase, project.id);
  const pinned = new Set(pins.map((p) => p.messageId));
  const { data: canPin } = await supabase.rpc("can_manage_project", { p: project.id });
  const decisions = view === "decisions";
  const time = new Intl.DateTimeFormat(locale, { timeZone: tz, hour: "2-digit", minute: "2-digit", hour12: false });
  const date = new Intl.DateTimeFormat(locale, { timeZone: tz, weekday: "long", day: "numeric", month: "long" });
  return <StreamView {...{ t, base: "/app/stream", query, days, project, rows, next, fresh, linked, proposed, actions, reactions, fileUrls, open, pins, pinned, canPin: !!canPin, mentionItems: mentions, decisions, time, date, now: new Date(), me }} />;
}
