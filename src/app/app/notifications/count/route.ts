import { NextResponse } from "next/server";
import { supabaseServer } from "@/auth/supabase";
import { unreadCount } from "@/data/projects";

// Polled by the bell; row-level security limits the count to the signed-in person's own rows.
export async function GET() {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  return NextResponse.json({ count: await unreadCount(supabase) });
}
