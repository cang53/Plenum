import { NextResponse } from "next/server";
import { supabaseServer } from "@/auth/supabase";

export async function POST(request: Request) {
  await (await supabaseServer()).auth.signOut();
  return NextResponse.redirect(new URL("/login", request.url), 303);
}
