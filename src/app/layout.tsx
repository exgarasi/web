import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "EXGARASI — Automotive Marketplace",
    template: "%s | EXGARASI",
  },
  description:
    "Marketplace otomotif untuk diecast, spare parts, accessories, dan automotive collectibles.",
  applicationName: "EXGARASI",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
