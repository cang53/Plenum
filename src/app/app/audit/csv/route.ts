import { supabaseServer } from "@/auth/supabase";
import { listAudit } from "@/data/live";
import { auditCsv, parseAuditFilters } from "@/domain/audit";

export async function GET(req: Request) {
  const params = new URL(req.url).searchParams;
  const project = params.get("project");
  if (!project) return new Response("project is required", { status: 400 });
  const rows = await listAudit(await supabaseServer(), project, parseAuditFilters(Object.fromEntries(params)));
  return new Response(auditCsv(rows), {
    headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": 'attachment; filename="audit-log.csv"' },
  });
}
