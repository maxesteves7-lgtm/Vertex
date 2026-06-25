import type { Metadata } from "next";
import { Suspense } from "react";
import { Inter } from "next/font/google";
import "./globals.css";
import { TopNav } from "@/components/TopNav";
import { CommandBar } from "@/components/CommandBar";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Futurist // Prediction Markets",
  description:
    "All Kalshi & Polymarket events in one clean, dark, Robinhood-style feed.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-[var(--bg)] text-[var(--fg)]">
        <Suspense fallback={<div className="h-14 border-b border-[var(--border)]" />}>
          <TopNav />
        </Suspense>
        {children}
        <CommandBar />
      </body>
    </html>
  );
}
