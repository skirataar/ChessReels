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
  title: "Doomchess | Tactical Chess Puzzles & Endless Reels",
  description: "Turn doomscrolling into tactical chess mastery. Solve bite-sized chess puzzles, track your ELO, and master opening repertoires.",
  metadataBase: new URL("https://doomchess.online"),
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "DoomChess",
  },
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    shortcut: ["/icon.svg"],
    apple: [
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
  },
  openGraph: {
    title: "Doomchess | Tactical Chess Puzzles & Endless Reels",
    description: "Turn doomscrolling into tactical chess mastery with infinite puzzle reels.",
    url: "https://doomchess.online",
    siteName: "Doomchess",
    images: [
      {
        url: "/icon.svg",
        width: 800,
        height: 800,
        alt: "Doomchess Logo",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Doomchess | Tactical Chess Puzzles",
    description: "Turn doomscrolling into tactical chess mastery.",
    images: ["/icon.svg"],
  },
  other: {
    "google-adsense-account": "ca-pub-8026676969982075",
  },
};

import { BottomNav } from "@/components/BottomNav";
import { PageTransition } from "@/components/PageTransition";
import { PWAUpdater } from "@/components/PWAUpdater";

export const viewport: Viewport = {
  themeColor: "#0f0e0d",
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
        <meta
          name="google-adsense-account"
          content={process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID || "ca-pub-8026676969982075"}
        />
        {(process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID || "ca-pub-8026676969982075") && (
          <script
            async
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID || "ca-pub-8026676969982075"}`}
            crossOrigin="anonymous"
          />
        )}
      </head>
      <body suppressHydrationWarning className="min-h-full flex flex-col bg-[#151413] text-[#f5f5f5] select-none overscroll-none pb-20">
        <PWAUpdater />
        <PageTransition>{children}</PageTransition>
        <BottomNav />
      </body>
    </html>
  );
}

