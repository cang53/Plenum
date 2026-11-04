"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { supabaseServer } from "@/auth/supabase";
import { acceptSuggestion, dismissSuggestion } from "@/data/live";
import { teamsPoster } from "@/server/teams";
import { logError } from "@/lib/log";
import { checkFiles, safeName } from "@/domain/attachments";
import type { ItemKind } from "@/domain/linking";
import { AGENT_ADDRESS, isAgentTagged } from "@/domain/agent";
import { reactionFor } from "@/domain/reactions";
import { hasFormatting, htmlToText, sanitizeHtml } from "@/domain/richtext";
import { attachmentText } from "@/server/attachment-text";
import { agentRespond } from "@/server/agent-run";
import { agentRuleAsk } from "@/server/agent-fake";
import { supabaseAgentIo } from "@/server/agent-io";
import { serviceConfig } from "@/server/inbound-config";
import { aiAsk, supabaseTriageIo, triageMessage } from "@/server/triage-run";

// Row-level security decides who may write; the database checks the message belongs to the project.
// Only a task without a source can take one, so an existing source is never replaced.
export async function linkMessageToTask(form: FormData): Promise<void> {
  const { data, error } = await (await supabaseServer()).from("tasks")
    .update({ source_message_id: String(form.get("messageId")) })
    .eq("id", String(form.get("taskId"))).is("source_message_id", null).select("id");
  if (error) throw error;
  if (!data?.length) throw new Error("task not found or already has a source");
  revalidatePath("/app/stream");
}

// Row-level rules let only a project manager pin; the database records who and when.
export async function togglePin(form: FormData): Promise<void> {
  const supabase = await supabaseServer();
  const messageId = String(form.get("messageId"));
  const { error } = form.get("pinned") === "1"
    ? await supabase.from("message_pins").delete().eq("message_id", messageId)
    : await supabase.from("message_pins").insert({ message_id: messageId, project_id: String(form.get("projectId")) });
  if (error) throw error;
  revalidatePath("/app/stream");
}

// Apply and Edit both end here: the person's click, with the title and details as shown, goes to the existing accept call.
export async function applySuggestion(form: FormData): Promise<void> {
  await acceptSuggestion(await supabaseServer(), String(form.get("id")), {
    kind: String(form.get("kind")) as ItemKind,
    title: String(form.get("title") ?? ""),
    details: String(form.get("details") ?? ""),
    ...(form.get("riskKind") ? { riskKind: form.get("riskKind") === "issue" ? "issue" as const : "risk" as const, likelihood: Number(form.get("likelihood")), severity: Number(form.get("severity")) } : {}),
  });
  revalidatePath("/app/stream");
}

export async function dismissSuggestionForm(form: FormData): Promise<void> {
  await dismissSuggestion(await supabaseServer(), String(form.get("id")));
  revalidatePath("/app/stream");
}

// Writes into the project's stream as the signed-in person; the subject is the conversation. The database function checks access.
// p_allow_empty is sent only with files, and p_html only with formatting, so plain messages still work before migrations 151 and 157 are applied.
// Files go to the private bucket under <project>/<message>/ and are recorded on the message by a second database function.
export async function postMessage(form: FormData): Promise<void> {
  // The editor sends its markup too. It is cleaned here, and the plain words (what the agent, Teams and search read) come from the cleaned markup.
  const clean = sanitizeHtml(String(form.get("html") ?? ""));
  const html = hasFormatting(clean) ? clean : "";
  const body = html ? htmlToText(html) : String(form.get("body") ?? "").trim();
  const files = form.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);
  if (!body && files.length === 0) return;
  if (checkFiles(files)) throw new Error(checkFiles(files)!);
  const supabase = await supabaseServer();
  const projectId = String(form.get("projectId"));
  const args = { p_project: projectId, p_body: body, p_subject: String(form.get("subject") ?? ""), ...(files.length ? { p_allow_empty: true } : {}), ...(html ? { p_html: html } : {}) };
  const replyTo = String(form.get("replyTo") ?? "");
  let { data: id, error } = await supabase.rpc("post_message", replyTo ? { ...args, p_reply_to: replyTo } : args);
  // Before migration 161 is applied the database does not know p_reply_to; the reply still goes out, without its quote link.
  if (error && replyTo && (error.code === "PGRST202" || error.code === "42883")) ({ data: id, error } = await supabase.rpc("post_message", args));
  if (error) throw error;
  // Files upload side by side, not one after another.
  await Promise.all(files.map(async (f) => {
    const path = `${projectId}/${id}/${crypto.randomUUID()}-${safeName(f.name)}`;
    const up = await supabase.storage.from("message-files").upload(path, f, { contentType: f.type });
    if (up.error) throw up.error;
    const { error: e } = await supabase.rpc("add_message_file", { p_message: id, p_path: path, p_filename: f.name, p_type: f.type, p_size: f.size });
    if (e) throw e;
  }));
  // The message is saved and the reply goes out now; the AI works after it, and must never lose the message.
  after(async () => {
    // Best effort: a Teams outage must not lose a message that is already saved.
    if (process.env.TEAMS_PROVIDER === "live") {
      const { data: p } = await supabase.from("projects").select("email_slug").eq("id", projectId).single();
      if (p && body) await teamsPoster().post({ projectSlug: p.email_slug, kind: "message", text: body }).catch((e) => logError("teams post failed", e));
    }
    try {
      const documents = files.length ? await attachmentText(await Promise.all(files.map(async (f) => ({ filename: f.name, contentType: f.type, content: Buffer.from(await f.arrayBuffer()) }))), { limit: 20000, keepLines: true }) : "";
      // Replying to one of CobIA's messages counts as tagging it.
      const answered = replyTo ? (await supabase.from("messages").select("from_address").eq("id", replyTo).eq("project_id", projectId).maybeSingle()).data : null;
      if (isAgentTagged(body) || answered?.from_address === AGENT_ADDRESS) {
        await agentRespond({ message: body, documents, today: new Date().toISOString().slice(0, 10) }, supabaseAgentIo(supabase, projectId, String(id)), aiAsk(process.env, agentRuleAsk));
      } else if (serviceConfig()) {
        // CobIA may also react on its own. A plain word check, no model call, so it costs nothing.
        const emoji = reactionFor(body);
        if (emoji) {
          const { error } = await supabase.rpc("agent_react", { p_message: id, p_emoji: emoji });
          if (error) logError("agent reaction failed", error);
        }
        // Ordinary chat: the AI may suggest one item, shown as a card under the message. A person still decides.
        const c = serviceConfig()!;
        await triageMessage(String(id), supabaseTriageIo(c.supabaseUrl, c.serviceRoleKey), aiAsk(), documents);
      }
    } catch (e) {
      logError("agent step failed", e);
    }
  });
  revalidatePath("/app/stream");
}

// The person's click on a proposal from the agent. The database makes the change; the plan and the board show it next load.
export async function resolveAgentAction(form: FormData): Promise<void> {
  const { error } = await (await supabaseServer()).rpc("resolve_agent_action", { p_id: String(form.get("id")), p_accept: form.get("accept") === "1" });
  if (error) throw error;
  for (const path of ["/app/stream", "/app/gantt", "/app/board", "/app/items"]) revalidatePath(path);
}

// Undo of an accepted proposal: the database restores the dates or removes the created task.
export async function undoAgentAction(form: FormData): Promise<void> {
  const { error } = await (await supabaseServer()).rpc("undo_agent_action", { p_id: String(form.get("id")) });
  if (error) throw error;
  for (const path of ["/app/stream", "/app/gantt", "/app/board", "/app/items"]) revalidatePath(path);
}

// A person's click on an emoji: the database adds it, or removes it when they already gave it.
export async function toggleReaction(form: FormData): Promise<void> {
  const { error } = await (await supabaseServer()).rpc("toggle_reaction", { p_message: String(form.get("messageId")), p_emoji: String(form.get("emoji")) });
  if (error) throw error;
  revalidatePath("/app/stream");
}
