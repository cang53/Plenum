import { notFound } from "next/navigation";
import { authProvider } from "@/auth/provider";

// Auth.js endpoints exist only while AUTH_PROVIDER=entra, so the email link setup is untouched when it is off.
export async function GET(request: Request) {
  if (authProvider() !== "entra") notFound();
  return (await import("@/auth/entra")).handlers.GET(request as never);
}

export async function POST(request: Request) {
  if (authProvider() !== "entra") notFound();
  return (await import("@/auth/entra")).handlers.POST(request as never);
}
