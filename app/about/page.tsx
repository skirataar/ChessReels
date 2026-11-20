import React from "react";
import Link from "next/link";
import type { Metadata } from "next";
import {
  ArrowLeft,
  ShieldCheck,
  Cpu,
  BatteryCharging,
  FileText,
  Mail,
  Sparkles,
  ExternalLink,
  Target,
  Trophy,
  Users,
  Code2,
  BookOpen,
} from "lucide-react";
import { SUPPORT_EMAIL, SUPPORT_MAILTO } from "@/lib/support";
import { PublicFooter } from "@/components/PublicFooter";

export const metadata: Metadata = {
  title: "About DoomChess — Mission, Technology & ELO Calibration",
  description:
    "Learn how DoomChess turns passive doomscrolling into sharp tactical instinct with 6.15M+ verified chess puzzles and continuous Elo calibration.",
  alternates: {
    canonical: "https://doomchess.online/about",
  },
  openGraph: {
    title: "About DoomChess — Mission, Technology & ELO Calibration",
    description:
      "Learn how DoomChess turns passive doomscrolling into sharp tactical instinct with 6.15M+ verified chess puzzles and continuous Elo calibration.",
    url: "https://doomchess.online/about",
    type: "website",
  },
};

export default function AboutPage() {
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

          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#c29b78]/15 border border-[#c29b78]/30 text-[#c29b78]">
              v2.4 Production
            </span>
          </div>
        </div>

        {/* Hero Header */}
        <header className="mb-10 space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#c29b78]/10 border border-[#c29b78]/25 text-[#c29b78] text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5 stroke-[1.8]" />
            <span>Our Mission &amp; Technology</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-[#f5f2eb]">
            Turn Doomscrolling into Grandmaster Instinct
          </h1>
          <p className="text-sm text-zinc-400 max-w-xl leading-relaxed">
            DoomChess is engineered to reclaim passive mobile screen time. By packaging grandmaster chess combinations into rapid vertical reels, we help players build instinctive tactical pattern recognition.
          </p>
        </header>

        {/* Core Pillars */}
        <div className="space-y-6 text-xs sm:text-sm text-zinc-300 leading-relaxed mb-12">
          {/* Mission */}
          <section className="p-6 rounded-2xl bg-[#12100e] border border-white/[0.08] space-y-3 shadow-xl">
            <div className="flex items-center gap-2 text-[#c29b78] font-bold text-sm sm:text-base">
              <Target className="w-4 h-4 shrink-0" />
              <span>The DoomChess Mission</span>
            </div>
            <p>
              Modern digital interfaces are designed to maximize passive consumption. Billions of hours are spent scrolling through algorithmic feeds that offer fleeting entertainment without mental engagement.
            </p>
            <p>
              DoomChess flips this paradigm: we utilize the intuitive, frictionless swipe interaction of modern short-form feeds to deliver high-density cognitive training. Instead of algorithmically generated trivia, every swipe presents an authentic tournament chess position evaluated by neural network chess engines. You solve, calculate, and sharpen your decision-making in seconds.
            </p>
          </section>

          {/* Adaptive ELO Calibration */}
          <section className="p-6 rounded-2xl bg-[#12100e] border border-white/[0.08] space-y-3 shadow-xl">
            <div className="flex items-center gap-2 text-[#c29b78] font-bold text-sm sm:text-base">
              <Trophy className="w-4 h-4 shrink-0" />
              <span>Adaptive Elo Rating &amp; Calibration Engine</span>
            </div>
            <p>
              One size does not fit all in chess tactical study. A 900-Elo player faced with an obscure 2400-level deflection sacrifice experiences frustration, while an 1800-Elo player quickly bores of basic back-rank mates.
            </p>
            <p>
              DoomChess incorporates a dynamic Glicko/Elo calibration engine. During onboarding, an initial sequence benchmarks your calculation baseline. As you solve positions, your rating recalculates in real-time based on move accuracy, time-to-solve, and hint usage. Every puzzle in our database simultaneously holds its own difficulty rating, constantly refined by global solve/fail outcomes across millions of attempts.
            </p>
          </section>

          {/* 6.15M+ Curated Puzzles & Stockfish 16 */}
          <section className="p-6 rounded-2xl bg-[#12100e] border border-white/[0.08] space-y-3 shadow-xl">
            <div className="flex items-center gap-2 text-[#c29b78] font-bold text-sm sm:text-base">
              <Cpu className="w-4 h-4 shrink-0" />
              <span>Stockfish 16 Engine &amp; 6.15M+ Database</span>
            </div>
            <p>
              Every puzzle featured on DoomChess is sourced from official tournament games and open grandmaster archives, rigorously filtered and validated with the Stockfish 16 open-source chess engine. Positions with dual winning continuations or ambiguous lines are pruned to guarantee that every solution represents a strictly forced tactical win or decisive material capture.
            </p>
          </section>

          {/* Continuous Battery Recharge Model */}
          <section className="p-6 rounded-2xl bg-[#12100e] border border-white/[0.08] space-y-3 shadow-xl">
            <div className="flex items-center gap-2 text-[#c29b78] font-bold text-sm sm:text-base">
              <BatteryCharging className="w-4 h-4 shrink-0" />
              <span>The Continuous Battery Cell</span>
            </div>
            <p>
              Cognitive science demonstrates that calculation accuracy collapses under mental exhaustion. DoomChess features a progressive battery model: free accounts recharge 1 puzzle charge every 16 minutes (~4 per hour), scaling to a full 15-charge capacity in 4 hours.
            </p>
            <p>
              This cadence actively supports spaced repetition: instead of exhausting 3-hour cram sessions that result in careless guessing, players engage in brief, hyper-focused tactical sprints throughout the day.
            </p>
          </section>

          {/* Who Built It */}
          <section className="p-6 rounded-2xl bg-[#12100e] border border-white/[0.08] space-y-3 shadow-xl">
            <div className="flex items-center gap-2 text-[#c29b78] font-bold text-sm sm:text-base">
              <Code2 className="w-4 h-4 shrink-0" />
              <span>Engineering &amp; Craft</span>
            </div>
            <p>
              DoomChess was architected by passionate chess players and software engineers committed to minimalist, ultra-responsive digital design. Built on Next.js, TypeScript, PostgreSQL, and high-frequency WebSocket engines, the application is tuned for 60fps gesture response and instantaneous sound effects on mobile and desktop web.
            </p>
          </section>

          {/* Explore Guides Callout */}
          <section className="p-6 rounded-2xl bg-[#151311] border border-[#c29b78]/30 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="space-y-1 text-center sm:text-left">
              <div className="flex items-center justify-center sm:justify-start gap-1.5 text-xs font-bold text-[#c29b78] font-mono uppercase tracking-wider">
                <BookOpen className="w-3.5 h-3.5" />
                <span>Knowledge Base</span>
              </div>
              <h3 className="text-base font-bold text-white">
                Read Our Tactical Chess Guides
              </h3>
              <p className="text-xs text-zinc-400">
                Explore in-depth tactical guides on knight forks, pins, skewers, back-rank checkmates, and ELO growth.
              </p>
            </div>
            <Link
              href="/guides"
              className="px-5 py-2.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] border border-white/10 text-xs font-bold text-white transition-colors shrink-0"
            >
              Browse Guides
            </Link>
          </section>

          {/* Support Section */}
          <section className="p-6 rounded-2xl bg-[#12100e] border border-white/[0.08] flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
            <div className="flex items-center gap-3 text-center sm:text-left">
              <div className="p-2.5 rounded-xl bg-[#0a0908] text-[#c29b78] border border-white/5 shrink-0">
                <Mail className="w-5 h-5" />
              </div>
              <div>
                <div className="font-bold text-white text-xs sm:text-sm">
                  Customer Support &amp; Community Feedback
                </div>
                <div className="text-xs text-zinc-400">{SUPPORT_EMAIL}</div>
              </div>
            </div>
            <a
              href={SUPPORT_MAILTO}
              className="px-4 py-2 rounded-xl bg-[#c29b78] hover:bg-[#d4b08f] text-[#0a0908] font-bold text-xs flex items-center gap-1.5 transition-colors shrink-0 shadow-sm"
            >
              <span>Email Support</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </section>
        </div>
      </div>

      <PublicFooter />
    </div>
  );
}
