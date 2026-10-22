import type { Metadata } from "next";
import { getLocale } from "@/lib/locale";
import { t } from "@/lib/messages";
import "./globals.css";

export const metadata: Metadata = {
  title: t("app.name"),
  description: t("app.tagline"),
};

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
      </body>
    </html>
  );
}
