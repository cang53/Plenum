import { createClient } from "@supabase/supabase-js";
import { expect, type Locator, type Page } from "@playwright/test";

export const admin = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
const mail = process.env.MAIL_API_URL ?? "http://127.0.0.1:54324";

// The sign-in email for this address, read from the local Supabase mail catcher (Mailpit).
async function signInLink(email: string): Promise<string> {
  for (let i = 0; i < 30; i++) {
    const list = await (await fetch(`${mail}/api/v1/search?query=${encodeURIComponent(`to:${email}`)}`)).json();
    const id = list.messages?.[0]?.ID;
    if (id) {
      const message = await (await fetch(`${mail}/api/v1/message/${id}`)).json();
      const link = /https?:\/\/[^\s"<>]+\/auth\/v1\/verify[^\s"<>]*/.exec(`${message.Text} ${message.HTML}`)?.[0];
      if (link) return link.replace(/&amp;/g, "&");
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error("sign-in email did not arrive");
}

export async function signIn(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("Work email").fill(email);
  await page.getByRole("button", { name: "Send me a link" }).click();
  await expect(page.getByRole("status")).toBeVisible();
  await page.goto(await signInLink(email));
  await expect(page).toHaveURL(/\/app/);
}

// A workspace admin who manages a new project.
export async function createManager(run: string, email: string, projectName: string) {
  const { data, error } = await admin.auth.admin.createUser({ email, email_confirm: true });
  if (error) throw error;
  const user = data.user.id;
  await admin.from("profiles").insert({ id: user, display_name: "E2E manager", email }).throwOnError();
  const { data: ws } = await admin.from("workspaces").insert({ name: `E2E ${run}` }).select("id").single().throwOnError();
  await admin.from("workspace_members").insert({ workspace_id: ws!.id, user_id: user, kind: "staff", is_admin: true }).throwOnError();
  // created_by makes the person the project manager (database trigger).
  const { data: project } = await admin.from("projects").insert({ workspace_id: ws!.id, name: projectName, email_slug: `e2e-${run}`, created_by: user }).select("id").single().throwOnError();
  return { user, workspace: ws!.id, project: project!.id };
}

// next dev may not have hydrated the page yet, so a first click can be lost: click again until `done` holds.
export async function clickUntil(button: Locator, done: () => Promise<void>) {
  await expect(async () => {
    if (await button.count()) await button.click({ timeout: 2000 });
    await done();
  }).toPass({ timeout: 30_000 });
}
