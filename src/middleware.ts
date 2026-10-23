import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { needsSession } from "@/auth/provider";
import { buildCsp, cspHeaderName } from "@/lib/csp";

// Sets the nonce CSP on every page, refreshes the session cookie and sends signed-out visitors to /login.
export async function middleware(request: NextRequest) {
  const nonce = btoa(crypto.randomUUID());
  const csp = buildCsp(nonce, process.env.NODE_ENV === "development");
  const name = cspHeaderName();
  request.headers.set(name, csp);
  request.headers.set("x-nonce", nonce);
  const next = () => {
    const res = NextResponse.next({ request });
    res.headers.set(name, csp);
    return res;
  };
  const path = request.nextUrl.pathname;
  if (!/^\/(app|login|auth)(\/|$)/.test(path)) return next();
  let response = next();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (list) => {
          list.forEach(({ name, value }) => request.cookies.set(name, value));
          response = next();
          list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    },
  );
  const { data } = await supabase.auth.getUser();
  if (!data.user && needsSession(request.nextUrl.pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?next=${encodeURIComponent(request.nextUrl.pathname)}`;
    const redirect = NextResponse.redirect(url);
    redirect.headers.set(name, csp);
    return redirect;
  }
  return response;
}

export const config = {
  matcher: [{ source: "/((?!api|_next/static|_next/image|favicon.ico|sw.js|icons).*)", missing: [{ type: "header", key: "next-router-prefetch" }] }],
};
