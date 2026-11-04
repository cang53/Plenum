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

// Applies the saved theme before first paint so there is no dark flash.
const THEME_BOOT = `try{if(localStorage.getItem("theme")==="light")document.documentElement.dataset.theme="light"}catch(e){}`;

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  return (
    <html lang={locale} suppressHydrationWarning>
      <body>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT }} />
        <a className="skip" href="#main">{t("app.skip", locale)}</a>
        {children}
        <OfflineBoot />
      </body>
    </html>
  );
}
