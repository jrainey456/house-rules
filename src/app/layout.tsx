import type { Metadata } from "next";
import { Special_Elite } from "next/font/google";
import "./globals.css";

export const dynamic = "force-dynamic";

const specialElite = Special_Elite({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-special-elite",
});

export const metadata: Metadata = {
  title: "House Rules",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={specialElite.variable}>{children}</body>
    </html>
  );
}
