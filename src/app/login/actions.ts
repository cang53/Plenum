"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { authProvider, safeNext } from "@/auth/provider";
import { supabaseServer } from "@/auth/supabase";

export async function sendLink(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const next = safeNext(String(formData.get("next") ?? ""));
  if (authProvider() !== "supabase" || !email) redirect("/login?error=1");
  const origin = (await headers()).get("origin") ?? "";
  const supabase = await supabaseServer();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}` },
  });
  redirect(error ? "/login?error=1" : "/login?sent=1");
}
