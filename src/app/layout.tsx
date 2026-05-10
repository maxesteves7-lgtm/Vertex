import type { Metadata } from "next";
import { JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { TabBar } from "@/components/TabBar";

const jetbrains = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PREDIX // Prediction Market Terminal",
  description:
    "Cross-exchange prediction market terminal — screener, order flow, and news.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${jetbrains.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-[var(--bg)] text-[var(--fg)] font-mono">
        <TabBar />
        {children}
      </body>
    </html>
  );
}
