"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { authProvider, safeNext } from "@/auth/provider";
import { supabaseServer } from "@/auth/supabase";
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
