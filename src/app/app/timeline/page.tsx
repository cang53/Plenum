import { supabaseServer } from "@/auth/supabase";
import { listLinkedItems, listPendingSuggestions, listTimelineMessages } from "@/data/live";
import { currentProject, listProjects } from "@/data/projects";
import { demoProject } from "@/data/demo";
import { t } from "@/lib/messages";
import { Timeline } from "@/app/demo/timeline/Timeline";
import { acceptSuggestionAction, dismissSuggestionAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function TimelinePage({ searchParams }: { searchParams: Promise<{ project?: string }> }) {
  const supabase = await supabaseServer();
  const project = currentProject(await listProjects(supabase), (await searchParams).project);
  if (!project) return <main className="page"><p>{t("projects.empty")}</p></main>;
  const [messages, suggestions, linked] = await Promise.all([
    listTimelineMessages(supabase, project.id),
    listPendingSuggestions(supabase, project.id),
    listLinkedItems(supabase, project.id),
  ]);
  return (
    <main className="page">
      <p className="eyebrow">{project.name}</p>
      <h1>{t("timeline.title")}</h1>
      <p className="intro">{t("timeline.intro")}</p>
      <Timeline key={project.id} messages={messages} suggestions={suggestions}
        linked={linked}
        onAccept={acceptSuggestionAction}
        onDismiss={dismissSuggestionAction}
        now={new Date().toISOString()}
        timeZone={demoProject.timeZone}
      />
    </main>
  );
}
