import { NextResponse } from "next/server";
import { safeNext } from "@/auth/provider";
import { supabaseServer } from "@/auth/supabase";

// The sign-in email links here with a one-time code that becomes a session cookie.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  if (code) {
    const { error } = await (await supabaseServer()).auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${safeNext(searchParams.get("next"))}`);
  }
  return NextResponse.redirect(`${origin}/login?error=1`);
}
