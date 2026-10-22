import NextAuth from "next-auth";
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id";

// Auth.js only proves who the person is; the Supabase session (and row-level security) is made in mapEntraUser.
// Reads AUTH_SECRET, AUTH_MICROSOFT_ENTRA_ID_ID and AUTH_MICROSOFT_ENTRA_ID_SECRET itself.
export const { handlers, auth, signIn } = NextAuth({
  providers: [
    MicrosoftEntraID({
      issuer: `https://login.microsoftonline.com/${process.env.AUTH_MICROSOFT_ENTRA_ID_TENANT_ID}/v2.0`,
    }),
  ],
});
