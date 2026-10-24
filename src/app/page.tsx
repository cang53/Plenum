import { redirect } from "next/navigation";

// The product lives under /app; signed-out visitors are sent on to /login by the middleware.
export default function Home() {
  redirect("/app");
}
