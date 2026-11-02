import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Chess Reel - Elo-Adaptive Chess Puzzles",
  description: "Mobile-first, Elo-adaptive chess puzzle reels with instant feedback",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Chess Reel",
  },
  icons: {
    icon: "/icons/icon.svg",
    apple: "/icons/icon.svg",
  },
};

import { BottomNav } from "@/components/BottomNav";
import { PageTransition } from "@/components/PageTransition";

export const viewport: Viewport = {
  themeColor: "#151413",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${inter.variable} ${geistSans.variable} ${geistMono.variable} font-sans h-full antialiased dark`}
    >
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200"
        />
      </head>
      <body suppressHydrationWarning className="min-h-full flex flex-col bg-[#151413] text-[#f5f5f5] select-none overscroll-none pb-20">
        <PageTransition>{children}</PageTransition>
        <BottomNav />
      </body>
    </html>
  );
}

