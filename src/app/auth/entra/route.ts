import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { authProvider, safeNext } from "@/auth/provider";
import { mapEntraUser } from "@/auth/entra-map";
import { supabaseServer } from "@/auth/supabase";

// Entra sign-in lands here: the Auth.js session becomes a Supabase session for the same person.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  if (authProvider() !== "entra") return NextResponse.redirect(`${origin}/login`);
  const { auth } = await import("@/auth/entra");
  const identity = await auth();
  const admin = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  if (await mapEntraUser(identity?.user?.email, admin, await supabaseServer())) {
    return NextResponse.redirect(`${origin}${safeNext(searchParams.get("next"))}`);
  }
  return NextResponse.redirect(`${origin}/login?error=1`);
}
