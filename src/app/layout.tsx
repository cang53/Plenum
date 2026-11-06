import type { Metadata, Viewport } from "next";
import { Outfit } from "next/font/google";
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

const outfit = Outfit({ subsets: ["latin"], variable: "--font-outfit", weight: ["300", "400", "500", "600"], display: "swap" });

// Matches the --ground token.
export const viewport: Viewport = { themeColor: "#dfdcdb", colorScheme: "light" };

// Applies the saved dark choice before first paint so there is no light flash.
const THEME_BOOT = `try{if(localStorage.getItem("theme")==="dark")document.documentElement.dataset.theme="dark"}catch(e){}`;

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  return (
    <html lang={locale} className={outfit.variable} suppressHydrationWarning>
      <body>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT }} />
        <a className="skip" href="#main">{t("app.skip", locale)}</a>
        {children}
        <OfflineBoot />
      </body>
    </html>
  );
}
