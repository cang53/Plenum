import { supabaseServer } from "@/auth/supabase";
import { listLinkedItems, listPendingSuggestions, listTimelineMessages } from "@/data/live";
import { currentProject, listProjects } from "@/data/projects";
import { demoProject } from "@/data/demo";
import { MoreLink } from "@/app/app/MoreLink";
import { getLocale, getT } from "@/lib/locale";
import { Timeline } from "@/app/demo/timeline/Timeline";
import { acceptSuggestionAction, dismissSuggestionAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function TimelinePage({ searchParams }: { searchParams: Promise<{ project?: string; after?: string }> }) {
  const t = await getT();
  const locale = await getLocale();
  const supabase = await supabaseServer();
  const { project: chosen, after } = await searchParams;
  const project = currentProject(await listProjects(supabase), chosen);
  if (!project) return <main id="main" className="page"><p>{t("projects.empty")}</p></main>;
  const { rows: messages, next } = await listTimelineMessages(supabase, project.id, after);
  const [suggestions, linked] = await Promise.all([
    listPendingSuggestions(supabase, project.id),
    listLinkedItems(supabase, project.id, messages.map((m) => m.id)),
  ]);
  return (
    <main id="main" className="page">
      <p className="eyebrow">{project.name}</p>
      <h1>{t("timeline.title")}</h1>
      <p className="intro">{t("timeline.intro")}</p>
      <Timeline key={project.id} messages={messages} suggestions={suggestions}
        linked={linked}
        onAccept={acceptSuggestionAction}
        onDismiss={dismissSuggestionAction}
        language={locale}
        now={new Date().toISOString()}
        timeZone={demoProject.timeZone}
      />
      <MoreLink path="/app/timeline" params={{ project: project.id }} next={next} label={t("paging.more")} />
    </main>
  );
}
