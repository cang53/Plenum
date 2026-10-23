import { supabaseServer } from "@/auth/supabase";
import { listLinkedItems, listPendingSuggestions, listTimelineMessages } from "@/data/live";
import { currentProject, listProjects } from "@/data/projects";
import { demoProject } from "@/data/demo";
import { FilterFields } from "@/app/app/FilterFields";
import { filterParams, parseFilters } from "@/domain/filters";
import { MoreLink } from "@/app/app/MoreLink";
import { getLocale, getT } from "@/lib/locale";
import { WorkSwitch } from "@/app/WorkSwitch";
import { Timeline } from "@/app/demo/timeline/Timeline";
import { acceptSuggestionAction, dismissSuggestionAction, replyAction, tagAttachmentAction, translateMessageAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function TimelinePage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const t = await getT();
  const locale = await getLocale();
  const supabase = await supabaseServer();
  const raw = await searchParams;
  const { project: chosen, after } = raw;
  const filters = parseFilters(raw);
  const project = currentProject(await listProjects(supabase), chosen);
  if (!project) return <main id="main" className="page"><p>{t("projects.empty")}</p></main>;
  const { rows: messages, next } = await listTimelineMessages(supabase, project.id, after, filters);
  const [suggestions, linked] = await Promise.all([
    listPendingSuggestions(supabase, project.id),
    listLinkedItems(supabase, project.id, messages.map((m) => m.id)),
  ]);
  const { data: role } = await supabase.rpc("project_role_of", { p: project.id });
  return (
    <main id="main" className="page">
      <p className="eyebrow">{project.name}</p>
      <h1>{t("timeline.title")}</h1>
      <p className="intro">{t("timeline.intro")}</p>
      <form action="/app/timeline" method="get" role="search">
        <input type="hidden" name="project" value={project.id} />
        <FilterFields t={t} values={filters} withSender />
        <button type="submit">{t("filter.apply")}</button>{" "}
        <a href={`/app/timeline?project=${project.id}`}>{t("filter.clear")}</a>
      </form>
      <WorkSwitch current="timeline" projectId={project.id} t={t} />
      <Timeline key={project.id} messages={messages} suggestions={suggestions}
        linked={linked}
        onAccept={acceptSuggestionAction}
        onDismiss={dismissSuggestionAction}
        onReply={replyAction}
        onTranslate={translateMessageAction}
        onTagAttachment={role === "project_manager" ? tagAttachmentAction : undefined}
        siteLogHref={role === "member" || role === "project_manager" ? `/app/sitelog?project=${project.id}&message={id}` : undefined}
        language={locale}
        now={new Date().toISOString()}
        timeZone={demoProject.timeZone}
      />
      <MoreLink path="/app/timeline" params={{ project: project.id, ...filterParams(filters) }} next={next} label={t("paging.more")} />
    </main>
  );
}
