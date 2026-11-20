import React from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft, Shield, ExternalLink, Lock } from "lucide-react";
import { PublicFooter } from "@/components/PublicFooter";

export const metadata: Metadata = {
  title: "Privacy Policy & Advertising Disclosure | DoomChess",
  description:
    "DoomChess privacy policy, data protection standards, and Google AdSense third-party cookie advertising disclosures.",
  alternates: {
    canonical: "https://doomchess.online/privacy-policy",
  },
  openGraph: {
    title: "Privacy Policy & Advertising Disclosure | DoomChess",
    description:
      "DoomChess privacy policy, data protection standards, and Google AdSense third-party cookie advertising disclosures.",
    url: "https://doomchess.online/privacy-policy",
    type: "website",
  },
};

export default function PrivacyPolicyPage() {
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
            <Shield className="w-5 h-5 stroke-[1.8]" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-[#f5f2eb]">
              Privacy Policy &amp; Cookie Disclosure
            </h1>
            <p className="text-xs text-zinc-500 font-mono">Last updated: November 2026</p>
          </div>
        </div>

        {/* Content Sections */}
        <div className="space-y-6 text-xs sm:text-sm leading-relaxed text-neutral-300">
          {/* Section 1 */}
          <section className="bg-[#12100e] border border-white/[0.08] rounded-2xl p-6 space-y-3 shadow-xl">
            <h2 className="text-sm font-bold text-[#c29b78] uppercase font-mono tracking-wider">
              1. Overview &amp; Scope
            </h2>
            <p>
              DoomChess (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;) operates the website located at <span className="text-zinc-100 font-mono">https://doomchess.online</span> and related tactical training web applications. We are committed to safeguarding the privacy and security of your personal data.
            </p>
            <p>
              This Privacy Policy details the types of information we collect, how it is utilized, and your choices regarding cookies and personalized advertising under applicable data privacy regulations, including the General Data Protection Regulation (GDPR) and California Consumer Privacy Act (CCPA).
            </p>
          </section>

          {/* Section 2: AdSense Mandatory Disclosure */}
          <section className="bg-[#141210] border border-[#c29b78]/30 rounded-2xl p-6 space-y-4 shadow-xl">
            <div className="flex items-center gap-2 text-[#c29b78] font-bold text-sm uppercase font-mono tracking-wider">
              <Lock className="w-4 h-4 shrink-0" />
              <span>2. Third-Party Advertising &amp; Google AdSense Cookie Disclosure</span>
            </div>
            <p>
              To keep our core tactical puzzle library accessible to chess players worldwide without mandatory paywalls, we partner with third-party advertising networks, including **Google AdSense**, to display programmatic advertisements on free accounts.
            </p>
            <div className="p-4 rounded-xl bg-[#0a0908] border border-white/5 space-y-3 text-xs text-zinc-300">
              <p>
                <strong>Google Cookie Usage:</strong> Third-party vendors, including Google, use cookies to serve advertisements based on a user&apos;s prior visits to this website or other websites on the Internet.
              </p>
              <p>
                <strong>Personalized Advertising:</strong> Google&apos;s use of advertising cookies enables it and its partners to serve targeted ads to users based on their navigation history across DoomChess and/or other sites across the World Wide Web.
              </p>
              <p>
                <strong>Opt-Out Mechanism:</strong> You may opt out of personalized advertising at any time by visiting Google&apos;s Ads Settings portal:
              </p>
              <div className="pt-1">
                <a
                  href="https://adssettings.google.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#c29b78]/15 hover:bg-[#c29b78]/25 border border-[#c29b78]/30 text-[#c29b78] font-semibold text-xs transition-colors"
                >
                  <span>Google Ad Settings (https://adssettings.google.com)</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
              <p className="pt-1">
                Alternatively, you can opt out of a third-party vendor&apos;s use of cookies for personalized advertising by visiting the Network Advertising Initiative or Digital Advertising Alliance opt-out portal at{" "}
                <a
                  href="https://www.aboutads.info/choices/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#c29b78] hover:underline"
                >
                  www.aboutads.info/choices
                </a>.
              </p>
            </div>
          </section>

          {/* Section 3: Essential Cookies & Local Storage */}
          <section className="bg-[#12100e] border border-white/[0.08] rounded-2xl p-6 space-y-3 shadow-xl">
            <h2 className="text-sm font-bold text-[#c29b78] uppercase font-mono tracking-wider">
              3. Essential Cookies &amp; Local Storage
            </h2>
            <p>
              DoomChess utilizes first-party HTTP cookies and browser localStorage strictly necessary for core application functionality:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-zinc-400">
              <li>
                <strong className="text-zinc-200">Authentication Session:</strong> Cryptographically signed session tokens to verify user identity without exposing credentials.
              </li>
              <li>
                <strong className="text-zinc-200">Tactical Calibration &amp; Elo:</strong> Storing recent puzzle solve history, Elo rating adjustments, and active daily streaks.
              </li>
              <li>
                <strong className="text-zinc-200">Dynamic Battery Timer:</strong> Tracking the continuous recharge timestamp (1 puzzle per 16 minutes) in browser memory.
              </li>
              <li>
                <strong className="text-zinc-200">Board Preferences:</strong> Persisting custom board themes, piece sound settings, and haptic feedback toggles.
              </li>
            </ul>
          </section>

          {/* Section 4: Data Protection */}
          <section className="bg-[#12100e] border border-white/[0.08] rounded-2xl p-6 space-y-3 shadow-xl">
            <h2 className="text-sm font-bold text-[#c29b78] uppercase font-mono tracking-wider">
              4. Data Protection &amp; Retention
            </h2>
            <p>
              We enforce strict industry-standard technical safeguards:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-zinc-400">
              <li>All network transmissions are encrypted over Transport Layer Security (HTTPS / TLS 1.3).</li>
              <li>User passwords are hashed using salt-based Argon2 / Bcrypt cryptographic digests. Plaintext passwords are never stored or logged.</li>
              <li>Payment details for Pro subscriptions are processed directly through PCI-DSS Level 1 certified gateways (Razorpay). DoomChess never stores your credit card numbers or banking PINs.</li>
            </ul>
          </section>

          {/* Section 5: User Rights */}
          <section className="bg-[#12100e] border border-white/[0.08] rounded-2xl p-6 space-y-3 shadow-xl">
            <h2 className="text-sm font-bold text-[#c29b78] uppercase font-mono tracking-wider">
              5. User Rights &amp; Account Deletion
            </h2>
            <p>
              Under global data privacy laws, you have the right to inspect, update, or permanently delete the personal data associated with your DoomChess account.
            </p>
            <p>
              You may trigger an automatic account deletion directly within your Profile Settings, or email our Data Protection team at <span className="text-[#c29b78] font-mono">privacy@doomchess.online</span>. Upon verification, all associated records, game statistics, and puzzle attempts are permanently purged from our primary database within 30 days.
            </p>
          </section>

          {/* Section 6: Contact */}
          <section className="bg-[#12100e] border border-white/[0.08] rounded-2xl p-6 space-y-3 shadow-xl">
            <h2 className="text-sm font-bold text-[#c29b78] uppercase font-mono tracking-wider">
              6. Contacting the Data Protection Officer
            </h2>
            <p>
              If you have questions regarding this Privacy Policy, cookie consents, or our advertising compliance, please contact us at:
            </p>
            <div className="font-mono text-zinc-200 text-xs">
              <div>DoomChess Privacy &amp; Legal Compliance</div>
              <div>Email: privacy@doomchess.online</div>
              <div>Support: support@doomchess.online</div>
            </div>
          </section>
        </div>
      </div>

      <PublicFooter />
    </div>
  );
}
