"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { authProvider, passwordLoginEnabled, safeNext } from "@/auth/provider";
import { demoRoleEmail, demoRolePickerEnabled } from "@/auth/demo-roles";
import { supabaseServer } from "@/auth/supabase";
import { createClient } from "@supabase/supabase-js";
import { clientKey, createPersistentLimiter, restRateLimitHit } from "@/lib/rate-limit";

export async function sendLink(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const next = safeNext(String(formData.get("next") ?? ""));
  if (authProvider() !== "supabase" || !email) redirect("/login?error=1");
  const origin = (await headers()).get("origin") ?? "";
  const supabase = await supabaseServer();
  // Shared across instances, by network address and by email address (so one inbox cannot be flooded).
  // A refusal looks like any other failed attempt. Counted by the server, never by the visitor.
  const hit = restRateLimitHit(process.env.SUPABASE_URL ?? "", process.env.SUPABASE_SERVICE_ROLE_KEY ?? "");
  const byAddress = createPersistentLimiter(hit, 10, 60_000);
  const byEmail = createPersistentLimiter(hit, 3, 60_000);
  const ip = clientKey({ headers: await headers() } as Request);
  if (!(await byAddress(`login:${ip}`)) || !(await byEmail(`login-email:${email.toLowerCase().slice(0, 150)}`))) {
    redirect("/login?error=1");
  }
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}` },
  });
  redirect(error ? "/login?error=1" : "/login?sent=1");
}

export async function signInWithEntra(formData: FormData) {
  if (authProvider() !== "entra") redirect("/login?error=1");
  const next = safeNext(String(formData.get("next") ?? ""));
  const { signIn } = await import("@/auth/entra");
  await signIn("microsoft-entra-id", { redirectTo: `/auth/entra?next=${encodeURIComponent(next)}` });
}

// Testing only (TEST_PASSWORD_LOGIN=1); rate limited like the email link.
export async function signInWithPassword(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = safeNext(String(formData.get("next") ?? ""));
  if (!passwordLoginEnabled() || !email || !password) redirect("/login?error=1");
  const hit = restRateLimitHit(process.env.SUPABASE_URL ?? "", process.env.SUPABASE_SERVICE_ROLE_KEY ?? "");
  const ip = clientKey({ headers: await headers() } as Request);
  if (!(await createPersistentLimiter(hit, 10, 60_000)(`login-password:${ip}`))) redirect("/login?error=1");
  const supabase = await supabaseServer();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) redirect("/login?error=1");
  await supabase.rpc("accept_my_invitations");
  redirect(next);
}

// MVP demo: enter as a seeded dummy person. A one-time link is made and used on the server; no password exists.
export async function pickRole(formData: FormData) {
  const email = demoRoleEmail(String(formData.get("role") ?? ""));
  if (!demoRolePickerEnabled() || !email) redirect("/login?error=1");
  const admin = createClient(process.env.SUPABASE_URL ?? "", process.env.SUPABASE_SERVICE_ROLE_KEY ?? "", { auth: { persistSession: false } });
  const { data } = await admin.auth.admin.generateLink({ type: "magiclink", email });
  const hash = data?.properties?.hashed_token;
  if (!hash) redirect("/login?error=1");
  const { error } = await (await supabaseServer()).auth.verifyOtp({ token_hash: hash, type: "magiclink" });
  redirect(error ? "/login?error=1" : "/app/projects");
}
