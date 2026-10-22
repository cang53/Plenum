import { demoMessages, demoProject } from "@/data/demo";
import { t } from "@/lib/messages";
import { Timeline } from "./Timeline";

// The demo emails are dated relative to the time of the request.
export const dynamic = "force-dynamic";

export default function DemoTimelinePage() {
  const now = new Date();
  return (
    <main className="page">
      <p className="eyebrow">{demoProject.name}</p>
      <h1>{t("timeline.title")}</h1>
      <p className="intro">{t("timeline.intro")}</p>
      <p className="notice">{t("timeline.demoNotice")}</p>
      <Timeline messages={demoMessages(now)} now={now.toISOString()} timeZone={demoProject.timeZone} />
    </main>
  );
}
