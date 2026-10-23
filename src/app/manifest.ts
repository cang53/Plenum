import type { MetadataRoute } from "next";
import { t } from "@/lib/messages";

// Colors are the --primary and --surface-subtle tokens; a manifest cannot read CSS variables.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: t("app.name"),
    short_name: t("app.name"),
    description: t("app.tagline"),
    start_url: "/app",
    scope: "/",
    display: "standalone",
    background_color: "#f0f5f3",
    theme_color: "#234f40",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" },
    ],
  };
}
