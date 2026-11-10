import React from "react";
import Link from "next/link";
import { ArrowLeft, FileText } from "lucide-react";

export const metadata = {
  title: "Terms of Service — DoomChess",
  description: "Terms and conditions of service for DoomChess.",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#0a0908] text-[#f5f2eb] px-4 py-8 sm:py-12 flex flex-col items-center">
      <div className="w-full max-w-2xl">
        <Link
          href="/play"
          className="inline-flex items-center gap-2 text-xs font-semibold text-[#c29b78] hover:text-[#dfb48c] mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 stroke-[2]" />
          <span>Back to App</span>
        </Link>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-[#c29b78]/10 border border-[#c29b78]/25 flex items-center justify-center text-[#c29b78]">
            <FileText className="w-5 h-5 stroke-[1.8]" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#f5f2eb]">
              Terms of Service
            </h1>
            <p className="text-xs text-[#78716c]">Last updated: November 2026</p>
          </div>
        </div>

        <div className="space-y-6 text-xs leading-relaxed text-zinc-300">
          <section className="bg-[#12100e] border border-white/[0.08] rounded-xl p-5 space-y-2">
            <h2 className="text-sm font-semibold text-[#c29b78] tracking-wide uppercase">
              1. Acceptance of Terms
            </h2>
            <p>
              By accessing or using DoomChess, you agree to be bound by these Terms of Service. If you do not agree to these terms, please discontinue using our service.
            </p>
          </section>

          <section className="bg-[#12100e] border border-white/[0.08] rounded-xl p-5 space-y-2">
            <h2 className="text-sm font-semibold text-[#c29b78] tracking-wide uppercase">
              2. Subscription Plans & Quota Batteries
            </h2>
            <p>
              DoomChess offers free tier accounts with dynamic puzzle quota recharge windows and rewarded ad extensions, as well as paid Pro subscriptions with unlimited battery, zero advertisements, and advanced training drills. Subscriptions renew automatically unless cancelled prior to the billing date.
            </p>
          </section>

          <section className="bg-[#12100e] border border-white/[0.08] rounded-xl p-5 space-y-2">
            <h2 className="text-sm font-semibold text-[#c29b78] tracking-wide uppercase">
              3. Fair Play & Anti-Farming
            </h2>
            <p>
              Automated scraping, bot-assisted puzzle solving, or intentional manipulation of rating algorithms is strictly prohibited. We reserve the right to reset unearned Elo ratings or terminate accounts violating fair play principles.
            </p>
          </section>

          <section className="bg-[#12100e] border border-white/[0.08] rounded-xl p-5 space-y-2">
            <h2 className="text-sm font-semibold text-[#c29b78] tracking-wide uppercase">
              4. Advertising Compliance
            </h2>
            <p>
              Free accounts are supported by advertising networks, including Google AdSense. Users agree not to artificially inflate ad impressions or interfere with ad delivery mechanisms.
            </p>
          </section>

          <section className="bg-[#12100e] border border-white/[0.08] rounded-xl p-5 space-y-2">
            <h2 className="text-sm font-semibold text-[#c29b78] tracking-wide uppercase">
              5. Governing Law
            </h2>
            <p>
              These Terms shall be governed and construed in accordance with applicable laws without regard to conflict of law provisions. Contact support@doomchess.com for any inquiries.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}

