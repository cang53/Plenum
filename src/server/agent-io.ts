// Database side of one agent turn. Everything runs as the signed-in person, so row-level security and the database
// functions decide what is allowed; only the daily call cap uses the service key, and only when it is set.
import type { SupabaseClient } from "@supabase/supabase-js";
import type { AgentIo } from "./agent-run";
import { serviceConfig } from "./inbound-config";
import { supabaseTriageIo } from "./triage-run";

export function supabaseAgentIo(supabase: SupabaseClient, projectId: string, messageId: string): AgentIo {
  const check = <T,>(r: { data: T | null; error: { message: string } | null }): T => { if (r.error) throw new Error(r.error.message); return r.data as T; };
  return {
    async tasks() {
      const rows = check(await supabase.from("tasks").select("id, title, start_date, due_date, status").eq("project_id", projectId).neq("status", "done").order("due_date", { nullsFirst: false }).limit(80));
      return (rows ?? []).map((t) => ({ id: t.id, title: t.title, startDate: t.start_date, dueDate: t.due_date, status: t.status }));
    },
    async history() {
      const rows = check(await supabase.from("messages").select("from_name, from_address, body_text").eq("project_id", projectId).order("received_at", { ascending: false }).limit(8));
      return (rows ?? []).reverse().map((m) => `${m.from_name || m.from_address}: ${String(m.body_text).slice(0, 300)}`);
    },
    async takeCall() {
      const config = serviceConfig();
      return config ? supabaseTriageIo(config.supabaseUrl, config.serviceRoleKey).takeCall(projectId) : true;
    },
    async reply(body) {
      check(await supabase.rpc("post_agent_reply", { p_message: messageId, p_body: body }));
    },
    async propose(actions) {
      check(await supabase.rpc("propose_agent_actions", {
        p_message: messageId,
        p_actions: actions.map((a) => ({ kind: a.kind, task_id: a.taskId, title: a.title, details: a.details, start_date: a.startDate, due_date: a.dueDate, reason: a.reason })),
      }));
    },
  };
}
