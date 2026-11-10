import React from "react";
import Link from "next/link";
import { ArrowLeft, Shield } from "lucide-react";

export const metadata = {
  title: "Privacy Policy — DoomChess",
  description: "Privacy policy, data protection, and advertising disclosure for DoomChess.",
};

export default function PrivacyPage() {
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
            <Shield className="w-5 h-5 stroke-[1.8]" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#f5f2eb]">
              Privacy Policy
            </h1>
            <p className="text-xs text-[#78716c]">Last updated: November 2026</p>
          </div>
        </div>

        <div className="space-y-6 text-xs leading-relaxed text-zinc-300">
          <section className="bg-[#12100e] border border-white/[0.08] rounded-xl p-5 space-y-2">
            <h2 className="text-sm font-semibold text-[#c29b78] tracking-wide uppercase">
              1. Overview & Scope
            </h2>
            <p>
              DoomChess (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;) provides mobile-first tactical chess training, puzzle reels, and Elo evaluation services. This Privacy Policy describes how we collect, use, and protect your information when you access our web application.
            </p>
          </section>

          <section className="bg-[#12100e] border border-white/[0.08] rounded-xl p-5 space-y-2">
            <h2 className="text-sm font-semibold text-[#c29b78] tracking-wide uppercase">
              2. Third-Party Advertising & Google AdSense
            </h2>
            <p>
              We partner with third-party advertising vendors, including Google AdSense, to display advertisements on free tier accounts. Google and other third-party vendors use cookies to serve ads based on prior visits to our website and other sites across the Internet.
            </p>
            <p>
              Google&apos;s use of advertising cookies enables it and its partners to serve ads to users based on their visit to DoomChess and/or other sites on the Internet. Users may opt out of personalized advertising by visiting Google Ads Settings (www.google.com/settings/ads) or through third-party industry opt-out portals such as www.aboutads.info.
            </p>
          </section>

          <section className="bg-[#12100e] border border-white/[0.08] rounded-xl p-5 space-y-2">
            <h2 className="text-sm font-semibold text-[#c29b78] tracking-wide uppercase">
              3. Cookies & Local Storage
            </h2>
            <p>
              DoomChess uses essential cookies and browser localStorage to maintain your authentication session, Elo rating, daily streaks, tactical bookmark saves, and quota battery levels. Third-party advertising partners may set cookies or web beacons to measure ad effectiveness and prevent ad fraud.
            </p>
          </section>

          <section className="bg-[#12100e] border border-white/[0.08] rounded-xl p-5 space-y-2">
            <h2 className="text-sm font-semibold text-[#c29b78] tracking-wide uppercase">
              4. Data Protection & Account Deletion
            </h2>
            <p>
              We protect user data using industry-standard salted hashing and encrypted connections. You may update your profile or delete your account at any time via Settings.
            </p>
          </section>

          <section className="bg-[#12100e] border border-white/[0.08] rounded-xl p-5 space-y-2">
            <h2 className="text-sm font-semibold text-[#c29b78] tracking-wide uppercase">
              5. Contact Us
            </h2>
            <p>
              For inquiries regarding privacy, data protection, or advertising compliance, contact us at privacy@doomchess.com.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}

