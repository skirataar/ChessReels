import React from "react";
import Link from "next/link";
import type { Metadata } from "next";
import {
  ArrowLeft,
  Mail,
  MessageSquare,
  Bug,
  CreditCard,
  ShieldAlert,
  Clock,
  ExternalLink,
  Sparkles,
} from "lucide-react";
import { SUPPORT_EMAIL, SUPPORT_MAILTO } from "@/lib/support";
import { PublicFooter } from "@/components/PublicFooter";

export const metadata: Metadata = {
  title: "Contact & Customer Support | DoomChess",
  description:
    "Get in touch with the DoomChess team for technical support, billing inquiries, bug reports, and community feedback.",
  alternates: {
    canonical: "https://doomchess.online/contact",
  },
  openGraph: {
    title: "Contact & Customer Support | DoomChess",
    description:
      "Get in touch with the DoomChess team for technical support, billing inquiries, bug reports, and community feedback.",
    url: "https://doomchess.online/contact",
    type: "website",
  },
};

export default function ContactPage() {
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
        <header className="mb-10 space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#c29b78]/10 border border-[#c29b78]/25 text-[#c29b78] text-xs font-semibold">
            <Mail className="w-3.5 h-3.5 stroke-[1.8]" />
            <span>Support Desk</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-[#f5f2eb]">
            Contact DoomChess
          </h1>
          <p className="text-sm text-zinc-400 max-w-xl leading-relaxed">
            Have a question about your account, found a bug in a puzzle continuation, or need help with a Pro subscription? Our support team is here to assist.
          </p>
        </header>

        {/* Primary Contact Card */}
        <div className="p-6 sm:p-8 rounded-2xl bg-[#12100e] border border-[#c29b78]/30 space-y-6 shadow-2xl mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="text-xs font-bold text-[#c29b78] font-mono uppercase tracking-wider">
                Official Support Channel
              </div>
              <div className="text-xl sm:text-2xl font-black text-white font-mono">
                {SUPPORT_EMAIL}
              </div>
              <p className="text-xs text-zinc-400">
                Direct email is our primary and fastest support channel.
              </p>
            </div>

            <a
              href={SUPPORT_MAILTO}
              className="px-6 py-3.5 rounded-xl bg-[#c29b78] hover:bg-[#d4b08f] text-[#0a0908] font-bold text-xs sm:text-sm tracking-wide transition-all shadow-lg shadow-[#c29b78]/25 flex items-center justify-center gap-2 shrink-0 active:scale-[0.98]"
            >
              <span>Compose Email</span>
              <ExternalLink className="w-4 h-4 stroke-[2]" />
            </a>
          </div>

          <div className="pt-4 border-t border-white/[0.06] flex items-center gap-2 text-xs text-zinc-400 font-mono">
            <Clock className="w-4 h-4 text-[#c29b78] shrink-0" />
            <span>Typical response time: Within 24 to 48 business hours.</span>
          </div>
        </div>

        {/* Contact Categories Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-12">
          {/* Billing & Subscriptions */}
          <div className="p-5 rounded-2xl bg-[#12100e] border border-white/[0.08] space-y-2.5">
            <div className="flex items-center gap-2 text-[#c29b78] font-bold text-xs uppercase font-mono tracking-wider">
              <CreditCard className="w-4 h-4 shrink-0" />
              <span>Billing &amp; Pro Accounts</span>
            </div>
            <p className="text-xs text-neutral-300 leading-relaxed">
              Inquiries regarding Razorpay checkout, subscription upgrades, cancellations, or invoice receipts. Please include the email address linked to your DoomChess account.
            </p>
          </div>

          {/* Puzzle Bug Reports */}
          <div className="p-5 rounded-2xl bg-[#12100e] border border-white/[0.08] space-y-2.5">
            <div className="flex items-center gap-2 text-[#c29b78] font-bold text-xs uppercase font-mono tracking-wider">
              <Bug className="w-4 h-4 shrink-0" />
              <span>Puzzle &amp; Engine Issues</span>
            </div>
            <p className="text-xs text-neutral-300 leading-relaxed">
              If you discover an alternate winning line, an incorrect Stockfish evaluation, or a display bug, share the Puzzle ID or FEN string so our engine team can review it.
            </p>
          </div>

          {/* Account Security & Privacy */}
          <div className="p-5 rounded-2xl bg-[#12100e] border border-white/[0.08] space-y-2.5">
            <div className="flex items-center gap-2 text-[#c29b78] font-bold text-xs uppercase font-mono tracking-wider">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>Security &amp; Data Deletion</span>
            </div>
            <p className="text-xs text-neutral-300 leading-relaxed">
              Requests for account deletion, two-factor authentication recovery, or GDPR/CCPA data export requests. We verify account ownership prior to processing deletion requests.
            </p>
          </div>

          {/* Partnerships & Advertising */}
          <div className="p-5 rounded-2xl bg-[#12100e] border border-white/[0.08] space-y-2.5">
            <div className="flex items-center gap-2 text-[#c29b78] font-bold text-xs uppercase font-mono tracking-wider">
              <MessageSquare className="w-4 h-4 shrink-0" />
              <span>Partnerships &amp; Feedback</span>
            </div>
            <p className="text-xs text-zinc-300 leading-relaxed">
              Inquiries regarding chess club affiliations, tournament sponsorships, content licensing, and AdSense advertising compliance.
            </p>
          </div>
        </div>
      </div>

      <PublicFooter />
    </div>
  );
}
