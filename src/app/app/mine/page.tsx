import { supabaseServer } from "@/auth/supabase";
import { listMyThreads } from "@/data/live";
import { currentProject, listProjects } from "@/data/projects";
import { getLocale, getT } from "@/lib/locale";
import { intlLocale } from "@/lib/messages";

export const dynamic = "force-dynamic";

// My Chatroom: my own view of the project. The threads I have written in, newest activity first, and a way to the messages that mention me.
export default async function MyChatroomPage({ searchParams }: { searchParams: Promise<{ project?: string }> }) {
  const t = await getT();
  const locale = intlLocale[await getLocale()];
  const supabase = await supabaseServer();
  const { project: chosen } = await searchParams;
  const project = currentProject(await listProjects(supabase), chosen);
  if (!project) return <main id="main" className="page"><p>{t("projects.empty")}</p></main>;
  const email = (await supabase.auth.getUser()).data.user?.email ?? "";
  const threads = email ? await listMyThreads(supabase, project.id, email) : [];
  const when = new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  return (
    <main id="main" className="page mine">
      <h1>{t("shell.myChatroom")}</h1>
      <p className="sub">{t("mine.lead")}</p>
      {threads.length === 0 ? <p className="sub">{t("mine.empty")}</p> : (
        <ul className="mine-list">
          {threads.map((th) => (
            <li key={th.id}>
              <a href={`/app/stream?project=${project.id}&room=${th.roomId}&thread=${th.id}`}>
                <span className="mine-title">{th.title}</span>
                <span className="mine-meta">{th.roomEmoji ? `${th.roomEmoji} ` : "# "}{th.roomName} · {t(th.replies === 1 ? "thread.count.one" : "thread.count.other").replace("{n}", String(th.replies))} · <time dateTime={th.lastAt}>{when.format(new Date(th.lastAt))}</time></span>
              </a>
            </li>
          ))}
        </ul>
      )}
      <p><a href={`/app/notifications?project=${project.id}&tab=mentions`}>{t("mine.mentions")}</a></p>
    </main>
  );
}
