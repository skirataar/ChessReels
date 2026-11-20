import React from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft, BookOpen, Clock, Calendar, ArrowRight, Target, Sparkles } from "lucide-react";
import { CHESS_GUIDES } from "@/lib/guides";
import { PublicFooter } from "@/components/PublicFooter";

export const metadata: Metadata = {
  title: "Tactical Chess Guides & Pattern Recognition | DoomChess",
  description:
    "Master essential chess tactics with in-depth guides on knight forks, back-rank mates, pins, skewers, discovered attacks, and ELO rating calibration.",
  alternates: {
    canonical: "https://doomchess.online/guides",
  },
  openGraph: {
    title: "Tactical Chess Guides & Pattern Recognition | DoomChess",
    description:
      "Master essential chess tactics with in-depth guides on knight forks, back-rank mates, pins, skewers, discovered attacks, and ELO rating calibration.",
    url: "https://doomchess.online/guides",
    type: "website",
  },
};

const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  Forks: {
    bg: "bg-amber-500/10",
    text: "text-amber-400",
    border: "border-amber-500/20",
  },
  "Pins & Skewers": {
    bg: "bg-emerald-500/10",
    text: "text-emerald-400",
    border: "border-emerald-500/20",
  },
  "Checkmate Patterns": {
    bg: "bg-rose-500/10",
    text: "text-rose-400",
    border: "border-rose-500/20",
  },
  "Discovered Attacks": {
    bg: "bg-indigo-500/10",
    text: "text-indigo-400",
    border: "border-indigo-500/20",
  },
  "Deflection & Overload": {
    bg: "bg-purple-500/10",
    text: "text-purple-400",
    border: "border-purple-500/20",
  },
  "ELO Training": {
    bg: "bg-sky-500/10",
    text: "text-sky-400",
    border: "border-sky-500/20",
  },
  "Endgame Tactics": {
    bg: "bg-cyan-500/10",
    text: "text-cyan-400",
    border: "border-cyan-500/20",
  },
};

export default function GuidesPage() {
  return (
    <div className="min-h-screen bg-[#0a0908] text-[#f5f2eb] flex flex-col justify-between selection:bg-[#c29b78] selection:text-[#0a0908] select-text">
      <div className="w-full max-w-5xl mx-auto px-4 py-8 sm:py-12 flex-1">
        {/* Navigation Bar */}
        <div className="flex items-center justify-between mb-8">
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

        {/* Hero Section */}
        <header className="mb-12">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#c29b78]/10 border border-[#c29b78]/25 text-[#c29b78] text-xs font-semibold mb-4">
            <BookOpen className="w-3.5 h-3.5 stroke-[1.8]" />
            <span>Master Tactical Motifs</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-[#f5f2eb] mb-3">
            Tactical Chess Guides &amp; Pattern Mastery
          </h1>
          <p className="text-sm text-neutral-300 max-w-2xl leading-relaxed">
            Short-form pattern recognition is the engine of tactical intuition. Explore structured breakdowns of core chess combinations, legal nuances, and calculation techniques verified against grandmaster principles.
          </p>
        </header>

        {/* Guides Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-16">
          {CHESS_GUIDES.map((guide) => {
            const catStyle = CATEGORY_COLORS[guide.category] || {
              bg: "bg-[#c29b78]/10",
              text: "text-[#c29b78]",
              border: "border-[#c29b78]/20",
            };

            return (
              <article
                key={guide.slug}
                className="group relative flex flex-col justify-between p-6 rounded-2xl bg-[#12100e] border border-white/10 hover:border-[#c29b78]/40 hover:bg-[#151311] transition-all duration-200 hover:shadow-xl hover:shadow-black/40"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span
                      className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${catStyle.bg} ${catStyle.text} ${catStyle.border}`}
                    >
                      {guide.category}
                    </span>
                    <div className="flex items-center gap-3 text-[11px] text-neutral-500 font-mono">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {guide.readTime}
                      </span>
                    </div>
                  </div>

                  <h2 className="text-lg font-bold text-[#f5f2eb] group-hover:text-[#c29b78] transition-colors leading-snug mb-2">
                    <Link href={`/guides/${guide.slug}`} className="focus:outline-none">
                      {guide.title}
                    </Link>
                  </h2>

                  <p className="text-xs text-neutral-300 leading-relaxed line-clamp-3 mb-4">
                    {guide.summary}
                  </p>
                </div>

                <div className="pt-4 border-t border-white/[0.06] flex items-center justify-between mt-auto">
                  <div className="flex items-center gap-1.5 text-[11px] text-neutral-500 font-mono">
                    <Calendar className="w-3 h-3" />
                    <span>{guide.publishedAt}</span>
                  </div>

                  <Link
                    href={`/guides/${guide.slug}`}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#c29b78] group-hover:translate-x-1 transition-transform"
                  >
                    <span>Read Guide</span>
                    <ArrowRight className="w-3.5 h-3.5 stroke-[2]" />
                  </Link>
                </div>
              </article>
            );
          })}
        </div>

        {/* Practice Banner */}
        <section className="p-8 rounded-2xl bg-gradient-to-r from-[#171513] via-[#1a1715] to-[#171513] border border-[#c29b78]/30 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-2xl">
          <div className="space-y-2 text-center sm:text-left">
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#c29b78] uppercase font-mono tracking-wider">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Interactive Training</span>
            </div>
            <h3 className="text-xl font-bold text-white">
              Put Theory into Instinctive Motion
            </h3>
            <p className="text-xs text-zinc-400 max-w-md">
              Train these exact motifs on our infinite vertical reel feed. Calibrated to your Elo with zero repetition across 6.15M+ puzzles.
            </p>
          </div>

          <Link
            href="/play"
            className="px-6 py-3.5 rounded-xl bg-[#c29b78] hover:bg-[#d4b08f] text-[#0a0908] font-bold text-xs sm:text-sm tracking-wide transition-all shadow-lg shadow-[#c29b78]/25 flex items-center gap-2 shrink-0 active:scale-[0.98]"
          >
            <Target className="w-4 h-4 stroke-[2]" />
            <span>Practice Puzzles Now</span>
          </Link>
        </section>
      </div>

      <PublicFooter />
    </div>
  );
}
