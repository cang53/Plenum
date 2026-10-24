// Sign-in sits behind one switch so Entra ID can replace the interim email link without touching pages.
export type AuthProvider = "supabase" | "entra";

export function authProvider(env: Record<string, string | undefined> = process.env): AuthProvider {
  return env.AUTH_PROVIDER === "entra" ? "entra" : "supabase";
}

// Only same-site paths may follow sign-in, so a crafted link cannot send people elsewhere.
export function safeNext(next: string | null | undefined): string {
  return next && /^\/(?![/\\])/.test(next) ? next : "/app";
}

export function needsSession(pathname: string): boolean {
  return pathname === "/app" || pathname.startsWith("/app/");
}

// Off unless TEST_PASSWORD_LOGIN=1: a password form for testing before the sign-in email is set up.
export function passwordLoginEnabled(env: Record<string, string | undefined> = process.env): boolean {
  return env.TEST_PASSWORD_LOGIN === "1" && authProvider(env) === "supabase";
}
