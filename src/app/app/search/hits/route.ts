import { supabaseServer } from "@/auth/supabase";
import { searchProject } from "@/data/projects";
import { logError } from "@/lib/log";

// Feeds the command menu with the same search the search page uses; row-level security still applies.
export async function GET(req: Request) {
  const q = new URL(req.url).searchParams;
  const project = q.get("project");
  const text = (q.get("q") ?? "").trim().slice(0, 200);
  if (!project || !text) return Response.json([]);
  try {
    const { rows } = await searchProject(await supabaseServer(), project, text);
    return Response.json(rows.slice(0, 8));
  } catch (e) {
    logError("command-menu", e);
    return new Response("search failed", { status: 500 });
  }
}
