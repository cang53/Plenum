import type { SupabaseClient } from "@supabase/supabase-js";

type Admin = Pick<SupabaseClient, "auth">;
type Session = Pick<SupabaseClient, "auth" | "rpc">;

// Maps an Entra identity to the same Supabase user the email link uses (matched by email address),
// so profiles, memberships and row-level security are unchanged. Returns false if no session could be made.
export async function mapEntraUser(email: string | null | undefined, admin: Admin, session: Session): Promise<boolean> {
  const address = email?.trim().toLowerCase();
  if (!address) return false;
  // A magic-link token is only used here, server side, to open the session; it is never sent to the person.
  const { data, error } = await admin.auth.admin.generateLink({ type: "magiclink", email: address });
  const tokenHash = data?.properties?.hashed_token;
  if (error || !tokenHash) return false;
  const verified = await session.auth.verifyOtp({ type: "magiclink", token_hash: tokenHash });
  if (verified.error) return false;
  await session.rpc("accept_my_invitations");
  return true;
}
