import { supabaseServer } from "@/auth/supabase";
import { tableCsv, type ExportDoc } from "@/domain/export";
import { logError } from "@/lib/log";

// Workspace admins only: the database function refuses everyone else and writes the audit entry.
export async function GET(req: Request) {
  const q = new URL(req.url).searchParams;
  const workspace = q.get("workspace");
  if (!workspace) return new Response("workspace is required", { status: 400 });
  const { data, error } = await (await supabaseServer()).rpc("export_workspace", { ws: workspace });
  if (error) {
    logError("export", error);
    return new Response("not allowed", { status: error.code === "42501" ? 403 : 500 });
  }
  const doc = data as ExportDoc;
  const table = q.get("table");
  const rows = table ? doc[table] : null;
  if (table && !Array.isArray(rows)) return new Response("unknown table", { status: 400 });
  const [body, type, name] = rows
    ? [tableCsv(rows as Record<string, unknown>[]), "text/csv; charset=utf-8", `${table}.csv`]
    : [JSON.stringify(doc, null, 2), "application/json", "plenum-export.json"];
  return new Response(body, {
    headers: { "content-type": type, "content-disposition": `attachment; filename="${name}"` },
  });
}
