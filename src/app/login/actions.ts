"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { authProvider, safeNext } from "@/auth/provider";
import { supabaseServer } from "@/auth/supabase";
import { clientKey, createPersistentLimiter } from "@/lib/rate-limit";

export async function sendLink(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const next = safeNext(String(formData.get("next") ?? ""));
  if (authProvider() !== "supabase" || !email) redirect("/login?error=1");
  const origin = (await headers()).get("origin") ?? "";
  const supabase = await supabaseServer();
  // Per address, shared across instances; a refusal looks like any other failed attempt.
  const allow = createPersistentLimiter(async (key, limit, windowSeconds) => {
    const { data, error: failure } = await supabase.rpc("rate_limit_hit", { p_key: key, p_limit: limit, p_window_seconds: windowSeconds });
    if (failure) throw failure;
    return data === true;
  }, 10, 60_000);
  if (!(await allow(`login:${clientKey({ headers: await headers() } as Request)}`))) redirect("/login?error=1");
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}` },
  });
  redirect(error ? "/login?error=1" : "/login?sent=1");
}
