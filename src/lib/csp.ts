// Per-request nonce CSP (S11-2). Next reads the nonce from the request's CSP header and tags its own scripts.
// shortcut: style-src keeps 'unsafe-inline' because React style props need it; scripts are nonce-only.
export function buildCsp(nonce: string, dev = false): string {
  const supabase = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const connect = ["'self'", ...(supabase ? [supabase, supabase.replace(/^http/, "ws")] : [])];
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${dev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self'",
    `connect-src ${connect.join(" ")}`,
    "worker-src 'self'",
    "manifest-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join("; ");
}

// Report-only until CSP_MODE=enforce is set on the host.
export const cspHeaderName = () =>
  process.env.CSP_MODE === "enforce" ? "Content-Security-Policy" : "Content-Security-Policy-Report-Only";
