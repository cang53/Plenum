import { NextResponse } from "next/server";
import { safeNext } from "@/auth/provider";
import { supabaseServer } from "@/auth/supabase";

// The sign-in email links here with a one-time code that becomes a session cookie.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  if (code) {
    const supabase = await supabaseServer();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Joins the person to any projects they were invited to by this email address.
      await supabase.rpc("accept_my_invitations");
      return NextResponse.redirect(`${origin}${safeNext(searchParams.get("next"))}`);
    }
  }
  return NextResponse.redirect(`${origin}/login?error=1`);
}
