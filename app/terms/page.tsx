import React from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft, FileText, CheckCircle2 } from "lucide-react";
import { PublicFooter } from "@/components/PublicFooter";

export const metadata: Metadata = {
  title: "Terms of Service | DoomChess",
  description:
    "Standard terms of service, fair play policies, and subscription terms for the DoomChess tactical training web app.",
  alternates: {
    canonical: "https://doomchess.online/terms",
  },
  openGraph: {
    title: "Terms of Service | DoomChess",
    description:
      "Standard terms of service, fair play policies, and subscription terms for the DoomChess tactical training web app.",
    url: "https://doomchess.online/terms",
    type: "website",
  },
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#0a0908] text-[#f5f2eb] flex flex-col justify-between selection:bg-[#c29b78] selection:text-[#0a0908] select-text">
      <div className="w-full max-w-3xl mx-auto px-4 py-8 sm:py-12 flex-1">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between mb-8 pb-4 border-b border-white/[0.06]">
          <Link
            href="/play"
            className="inline-flex items-center gap-2 text-xs font-semibold text-[#c29b78] hover:text-[#dfb48c] transition-colors"
          >
            <ArrowLeft className="w-4 h-4 stroke-[2]" />
            <span>Back to Play</span>
          </Link>

          <Link
            href="/"
            className="text-xs font-mono text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            doomchess.online
          </Link>
        </div>

        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-[#c29b78]/10 border border-[#c29b78]/25 flex items-center justify-center text-[#c29b78] shrink-0">
            <FileText className="w-5 h-5 stroke-[1.8]" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-[#f5f2eb]">
              Terms of Service
            </h1>
            <p className="text-xs text-zinc-500 font-mono">Last updated: November 2026</p>
          </div>
        </div>

        {/* Content Sections */}
        <div className="space-y-6 text-xs sm:text-sm leading-relaxed text-zinc-300">
          <section className="bg-[#12100e] border border-white/[0.08] rounded-2xl p-6 space-y-3 shadow-xl">
            <h2 className="text-sm font-bold text-[#c29b78] uppercase font-mono tracking-wider">
              1. Agreement to Terms
            </h2>
            <p>
              By accessing, browsing, or creating an account on DoomChess (https://doomchess.online), you agree to comply with and be legally bound by these Terms of Service. If you do not agree to these terms, you must refrain from using the platform.
            </p>
          </section>

          <section className="bg-[#12100e] border border-white/[0.08] rounded-2xl p-6 space-y-3 shadow-xl">
            <h2 className="text-sm font-bold text-[#c29b78] uppercase font-mono tracking-wider">
              2. Account Registration &amp; Security
            </h2>
            <p>
              You may use DoomChess as a guest or create an authenticated account. When creating an account, you agree to provide accurate information and maintain the confidentiality of your login credentials. You are responsible for all activities that occur under your account.
            </p>
          </section>

          <section className="bg-[#12100e] border border-white/[0.08] rounded-2xl p-6 space-y-3 shadow-xl">
            <h2 className="text-sm font-bold text-[#c29b78] uppercase font-mono tracking-wider">
              3. Subscriptions, Billing &amp; Cancellations
            </h2>
            <p>
              DoomChess offers optional paid Pro subscription tiers that grant unlimited puzzle battery capacity, zero third-party advertisements, and advanced training drills.
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-zinc-400">
              <li>
                <strong className="text-zinc-200">Billing Cycles:</strong> Pro subscriptions are billed on a recurring monthly or annual basis via Razorpay in your localized currency (INR, USD, GBP, or EUR).
              </li>
              <li>
                <strong className="text-zinc-200">Cancellation:</strong> You may cancel your subscription at any time via Profile Settings. Upon cancellation, your Pro benefits remain active until the end of your current paid billing period.
              </li>
              <li>
                <strong className="text-zinc-200">Refunds:</strong> Because digital entitlement and battery upgrades take effect immediately upon payment confirmation, recurring subscription fees are generally non-refundable except where mandated by applicable local law.
              </li>
            </ul>
          </section>

          <section className="bg-[#12100e] border border-white/[0.08] rounded-2xl p-6 space-y-3 shadow-xl">
            <h2 className="text-sm font-bold text-[#c29b78] uppercase font-mono tracking-wider">
              4. Fair Play &amp; Anti-Abuse Rules
            </h2>
            <p>
              To protect the integrity of our global leaderboards and dynamic Elo rating calibration, the following actions are strictly prohibited:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-zinc-400">
              <li>Using external chess engines, automated solving bots, or browser extensions to calculate puzzle solutions.</li>
              <li>Attempting to reverse-engineer our proprietary puzzle API endpoints or scrape puzzle coordinates without authorization.</li>
              <li>Artificial inflation of Elo ratings through coordinated match fixing or multi-account farming.</li>
              <li>Interfering with, blocking, or artificially generating clicks on Google AdSense advertisements.</li>
            </ul>
            <p>
              Violations will result in immediate rating resets, battery limits, or permanent account termination.
            </p>
          </section>

          <section className="bg-[#12100e] border border-white/[0.08] rounded-2xl p-6 space-y-3 shadow-xl">
            <h2 className="text-sm font-bold text-[#c29b78] uppercase font-mono tracking-wider">
              5. Intellectual Property
            </h2>
            <p>
              The DoomChess brand, logo, vector piece designs, sound design, and custom software code are the exclusive intellectual property of DoomChess. Chess game positions derived from public tournament records remain in the public domain.
            </p>
          </section>

          <section className="bg-[#12100e] border border-white/[0.08] rounded-2xl p-6 space-y-3 shadow-xl">
            <h2 className="text-sm font-bold text-[#c29b78] uppercase font-mono tracking-wider">
              6. Limitation of Liability &amp; Inquiries
            </h2>
            <p>
              DoomChess is provided on an &ldquo;as is&rdquo; and &ldquo;as available&rdquo; basis without warranties of any kind. For questions regarding these Terms, contact our legal desk at <span className="text-[#c29b78] font-mono">support@doomchess.online</span>.
            </p>
          </section>
        </div>
      </div>

      <PublicFooter />
    </div>
  );
}
