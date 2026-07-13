import type { Metadata } from "next";
import { Fraunces, Archivo } from "next/font/google";
import "./globals.css";

const fraunces = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["600"],
});

const archivo = Archivo({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "BrandForge — Brand identity in 90 seconds",
  description:
    "One sentence in, a complete brand identity out: vector logo system, validated color palette, typography, and design tokens your coding agents can use. An AI Agent Service on OKX.AI, paid per call on X Layer.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${archivo.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
