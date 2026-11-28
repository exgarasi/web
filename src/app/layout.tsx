import type { Metadata } from "next";
import "./globals.css";
import { LocaleProvider } from "@/components/locale-provider";

export const metadata: Metadata = {
  title: {
    default: "EXGARASI — Marketplace Otomotif",
    template: "%s | EXGARASI",
  },
  description:
    "Marketplace otomotif untuk diecast, suku cadang, aksesori, dan koleksi otomotif.",
  applicationName: "EXGARASI",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id">
      <body>
        <LocaleProvider>{children}</LocaleProvider>
      </body>
    </html>
  );
}
