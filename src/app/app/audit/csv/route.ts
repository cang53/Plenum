import { supabaseServer } from "@/auth/supabase";
import { listAudit } from "@/data/live";
import { auditCsv } from "@/domain/audit";

export async function GET(req: Request) {
  const project = new URL(req.url).searchParams.get("project");
  if (!project) return new Response("project is required", { status: 400 });
  const rows = await listAudit(await supabaseServer(), project);
  return new Response(auditCsv(rows), {
    headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": 'attachment; filename="audit-log.csv"' },
  });
}
