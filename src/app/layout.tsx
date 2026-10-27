import type { Metadata, Viewport } from "next";
import { getLocale } from "@/lib/locale";
import { t } from "@/lib/messages";
import { OfflineBoot } from "./OfflineBoot";
import "./globals.css";

export const metadata: Metadata = {
  title: t("app.name"),
  description: t("app.tagline"),
  icons: { apple: "/icons/apple-touch-icon.png" },
  appleWebApp: { capable: true, title: t("app.name"), statusBarStyle: "black-translucent" },
};

// Matches the --surface-subtle token.
export const viewport: Viewport = { themeColor: "#1a342b", colorScheme: "dark" };

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  return (
    <html lang={locale}>
      <body>
        <a className="skip" href="#main">{t("app.skip", locale)}</a>
        {children}
        <OfflineBoot />
      </body>
    </html>
  );
}
