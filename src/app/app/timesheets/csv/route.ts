import { supabaseServer } from "@/auth/supabase";
import { exportTimesheet } from "@/data/live";
import { timesheetCsv } from "@/domain/timesheet";

const isDate = (s: string | null): s is string => !!s && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s));

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams;
  const [project, from, to] = [q.get("project"), q.get("from"), q.get("to")];
  if (!project || !isDate(from) || !isDate(to)) return new Response("project, from and to are required", { status: 400 });
  try {
    const rows = await exportTimesheet(await supabaseServer(), project, from, to);
    return new Response(timesheetCsv(rows), {
      headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="timesheet-${from}-${to}.csv"` },
    });
  } catch {
    return new Response("not allowed", { status: 403 });
  }
}
