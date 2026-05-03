import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mind Garden",
  description: "Nested article workspace with rich editor and permissions",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="th">
      <body>{children}</body>
    </html>
  );
}
