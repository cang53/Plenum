// Pilot dry run against the local stack: seeds the demo project, sends three emails through the
// dev inbound endpoint, and checks the health page, messages and AI suggestions. Needs `npm run dev`.
// Usage: npm run pilot:dry-run -- you@example.test   (reads .env.local; safe to re-run)
import { execFileSync } from "node:child_process";
import { createClient } from "@supabase/supabase-js";

const email = process.argv[2] ?? "demo@example.test";
const app = process.env.APP_URL ?? "http://localhost:3000";
const admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const failures = [];
const check = (name, pass) => {
  console.log(`${pass ? "ok  " : "FAIL"} ${name}`);
  if (!pass) failures.push(name);
};

execFileSync("node", ["--env-file=.env.local", "scripts/seed-local.mjs", email], { stdio: "inherit" });

check("health page reports the database up", (await fetch(`${app}/api/health`)).status === 200);

const { data: profile } = await admin.from("profiles").select("id").eq("email", email).single();
const { data: member } = await admin.from("workspace_members").select("workspace_id").eq("user_id", profile.id).limit(1).single();
const { data: project } = await admin.from("projects").select("id, email_slug").eq("workspace_id", member.workspace_id).limit(1).single();

const run = Date.now().toString(36);
const emails = [
  ["Send the cabinet drawings", "Please send the updated cabinet drawings before Thursday."],
  ["Delivery moved", "The gearbox delivery is delayed by two weeks."],
  ["Thanks", "Thanks for the update, all good on our side."],
];
let stored = 0;
for (const [subject, body] of emails) {
  const res = await fetch(`${app}/api/dev/inbound`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ slug: project.email_slug, from: "partner@supplier.example", subject: `${subject} ${run}`, body }),
  });
  if (res.status === 201) stored++;
}
check("three emails stored through the project address", stored === emails.length);

const { count: messages } = await admin.from("messages").select("id", { count: "exact", head: true }).eq("project_id", project.id).like("subject", `%${run}`);
check("messages are on the project timeline", messages === emails.length);
const { count: suggestions } = await admin.from("suggestions").select("id", { count: "exact", head: true }).eq("project_id", project.id);
check("at least one AI suggestion waits for a person's click", suggestions > 0);

if (failures.length) process.exit(1);
console.log("Dry run passed. Now sign in and finish the steps in docs/pilot-day.md.");
