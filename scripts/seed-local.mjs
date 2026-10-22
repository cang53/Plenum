// Creates a demo person, workspace and the seeded demo project in the local Supabase stack.
// Usage: npm run seed -- you@example.test   (reads .env.local; safe to re-run)
import { createClient } from "@supabase/supabase-js";

const email = process.argv[2] ?? "demo@example.test";
const admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const ok = ({ data, error }) => {
  if (error) throw error;
  return data;
};

const { users } = ok(await admin.auth.admin.listUsers({ perPage: 1000 }));
let user = users.find((u) => u.email === email)?.id;
if (!user) user = ok(await admin.auth.admin.createUser({ email, email_confirm: true })).user.id;

ok(await admin.from("profiles").upsert({ id: user, display_name: "Demo manager", email }));
let ws = ok(await admin.from("workspace_members").select("workspace_id").eq("user_id", user).limit(1))[0]?.workspace_id;
if (!ws) {
  ws = ok(await admin.from("workspaces").insert({ name: "Demo workspace" }).select("id").single()).id;
  ok(await admin.from("workspace_members").insert({ workspace_id: ws, user_id: user, kind: "staff", is_admin: true }));
}
const projects = ok(await admin.from("projects").select("id").eq("workspace_id", ws).limit(1));
if (projects.length === 0) ok(await admin.rpc("seed_demo_project", { ws, manager: user }));
console.log(`${projects.length ? "Already seeded" : "Seeded a demo project"} for ${email}. Sign in at http://localhost:3000/login`);
