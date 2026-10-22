import { createClient } from "@supabase/supabase-js";
import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const admin = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
const mail = process.env.MAIL_API_URL ?? "http://127.0.0.1:54324";

const run = Date.now().toString(36);
const email = `pm-${run}@example.test`;
const slug = `e2e-${run}`;

// The sign-in email for this address, read from the local Supabase mail catcher (Mailpit).
async function signInLink(): Promise<string> {
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

test.beforeAll(async () => {
  const { data, error } = await admin.auth.admin.createUser({ email, email_confirm: true });
  if (error) throw error;
  const user = data.user.id;
  await admin.from("profiles").insert({ id: user, display_name: "E2E manager", email }).throwOnError();
  const { data: ws } = await admin.from("workspaces").insert({ name: `E2E ${run}` }).select("id").single().throwOnError();
  await admin.from("workspace_members").insert({ workspace_id: ws!.id, user_id: user, kind: "staff", is_admin: true }).throwOnError();
  // created_by makes the person the project manager (database trigger).
  await admin.from("projects").insert({ workspace_id: ws!.id, name: `E2E project ${run}`, email_slug: slug, created_by: user }).throwOnError();
});

test("sign in, receive a message, accept the suggestion, see the task on the board", async ({ page, request }) => {
  // /app needs a session, so this lands on the sign-in page; the emailed link signs in.
  await page.goto("/app");
  await expect(page).toHaveURL(/\/login/);
  await page.getByLabel("Work email").fill(email);
  await page.getByRole("button", { name: "Send me a link" }).click();
  await expect(page.getByRole("status")).toBeVisible();
  await page.goto(await signInLink());
  await expect(page).toHaveURL(/\/app/);
  await expect(page.locator("#main").getByText(email)).toBeVisible();
  const boardUrl = await page.locator("#main").getByRole("link", { name: "Board" }).getAttribute("href");

  // A message arrives through the local inbound endpoint and is triaged by the offline rules.
  const subject = `Send the cabinet drawings ${run}`;
  const posted = await request.post("/api/dev/inbound", {
    data: { slug, from: "aylin@supplier.example", subject, body: "Please send the updated cabinet drawings before Thursday." },
  });
  expect(posted.status()).toBe(201);

  await page.locator("#main").getByRole("link", { name: "Timeline" }).click();
  const suggestion = page.getByRole("group", { name: "Suggested by AI" });
  await expect(suggestion).toContainText(subject);
  // next dev may not have hydrated the page yet, so a first click can be lost: click again until it is accepted.
  await expect(async () => {
    if (await suggestion.count()) await suggestion.getByRole("button", { name: "Accept" }).click({ timeout: 2000 });
    await expect(suggestion).toHaveCount(0, { timeout: 3000 });
  }).toPass({ timeout: 30_000 });
  await expect(page.getByText("We could not save that decision")).toHaveCount(0);

  // The accepted suggestion is now a task on the board, and a status change is kept.
  await page.goto(boardUrl!);
  const card = page.getByRole("article").filter({ hasText: subject });
  await expect(card).toBeVisible();
  // The move is saved by a server action; wait for it to finish, or the reload can beat the save.
  const saved = page.waitForResponse((r) => r.request().method() === "POST" && new URL(r.url()).pathname.startsWith("/app/board"));
  await card.getByLabel("Status").selectOption("in_progress");
  await saved;
  await page.reload();
  await expect(page.getByRole("region", { name: "In progress" }).getByText(subject)).toBeVisible();

  // The signed-in pages have no axe violations either.
  const project = new URL(boardUrl!, "http://x").search;
  for (const path of ["/app", "/app/board", "/app/timeline", "/app/items", "/app/audit", "/app/members", "/app/notifications", "/app/search", "/app/settings"]) {
    // The search page is scanned with results on it.
    await page.goto(`${path}${project}${path === "/app/search" ? "&q=drawings" : ""}`);
    await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
    const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
    expect(violations.map((v) => `${path} ${v.id}: ${v.nodes[0]?.target}`)).toEqual([]);
  }
});
