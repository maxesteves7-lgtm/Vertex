import type { Metadata } from "next";
import { Suspense } from "react";
import { Inter, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { TopNav } from "@/components/TopNav";
import { CommandBar } from "@/components/CommandBar";
import { MacroTicker } from "@/components/MacroTicker";
import { Footer } from "@/components/Footer";
import { CookieBanner } from "@/components/CookieBanner";

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

/**
 * Inline script that runs BEFORE React hydrates. Reads the stored theme
 * from localStorage and applies the `light` class to <html> so the first
 * paint matches the user's preference — no flash-of-dark on light-mode
 * loads.
 */
const themeBootstrap = `
try {
  var t = localStorage.getItem('vertex.theme.v1');
  if (t === 'light') document.documentElement.classList.add('light');
} catch (e) {}
`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${plexMono.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootstrap }} />
      </head>
      <body className="min-h-full flex flex-col bg-[var(--bg)] text-[var(--fg)]">
        <Suspense fallback={null}>
          <Suspense fallback={<div className="h-14 border-b border-[var(--border)]" />}>
            <TopNav />
          </Suspense>
          <MacroTicker />
          {children}
          <Footer />
          <CookieBanner />
          <CommandBar />
        </Suspense>
      </body>
    </html>
  );
}
