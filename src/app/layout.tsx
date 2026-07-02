import type { Metadata } from "next";
import { Suspense } from "react";
import { Inter, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { TopNav } from "@/components/TopNav";
import { CommandBar } from "@/components/CommandBar";
import { MacroTicker } from "@/components/MacroTicker";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Futurist // Prediction Market Terminal",
  description:
    "Institutional-grade cross-exchange prediction market terminal — Kalshi + Polymarket.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${plexMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[var(--bg)] text-[var(--fg)]">
        <Suspense fallback={<div className="h-14 border-b border-[var(--border)]" />}>
          <TopNav />
        </Suspense>
        <MacroTicker />
        {children}
        <CommandBar />
      </body>
    </html>
  );
}
