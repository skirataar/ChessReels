"use client";

import React from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ShieldCheck,
  Cpu,
  BatteryCharging,
  FileText,
  Mail,
  Sparkles,
  ExternalLink,
} from "lucide-react";
import { SUPPORT_EMAIL, SUPPORT_MAILTO } from "@/lib/support";

export default function AboutPage() {
  return (
    <div className="bg-[#151413] text-[#f5f5f5] min-h-screen flex flex-col w-full selection:bg-[#c29b78] selection:text-[#151413] px-4 py-6 max-w-md mx-auto pb-24">
      {/* Header */}
      <header className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2.5">
          <Link
            href="/play"
            className="p-2 rounded-xl bg-[#22201e] hover:bg-[#2d2a28] text-[#a3a3a3] hover:text-[#f5f5f5] border border-white/5 transition-all cursor-pointer"
            aria-label="Back to play"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-base font-black tracking-tight text-[#f5f5f5] flex items-center gap-2">
              <span>About DoomChess</span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#c29b78]/15 border border-[#c29b78]/30 text-[#c29b78]">
                v1.2.0
              </span>
            </h1>
            <p className="text-[11px] text-[#a3a3a3]">
              Tactical Chess Reels &amp; Elo Mastery
            </p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="space-y-4">
        {/* Brand Philosophy */}
        <section className="p-4 rounded-2xl bg-[#22201e] border border-white/10 space-y-2.5 shadow-xl">
          <div className="flex items-center gap-2 text-[#c29b78] font-bold text-sm">
            <Sparkles className="w-4 h-4 shrink-0" />
            <span>Obsidian Tactical Theater</span>
          </div>
          <p className="text-[#a3a3a3] text-xs leading-relaxed">
            DoomChess revolutionizes tactical study by framing grandmaster chess into rapid, dopamine-driven vertical reels. By stripping away heavy menus and distractions, players focus 100% on calculation, piece geometry, and board awareness.
          </p>
        </section>

        {/* 6M+ Puzzles & Stockfish */}
        <section className="p-4 rounded-2xl bg-[#22201e] border border-white/10 space-y-2.5 shadow-xl">
          <div className="flex items-center gap-2 text-[#c29b78] font-bold text-sm">
            <Cpu className="w-4 h-4 shrink-0" />
            <span>6M+ Puzzles &amp; Stockfish Engine</span>
          </div>
          <p className="text-[#a3a3a3] text-xs leading-relaxed">
            Over six million tactical puzzles curated from master tournaments and open databases. Each puzzle is verified through Stockfish deep-engine evaluation and dynamically served according to your personal Elo baseline.
          </p>
        </section>

        {/* Continuous Dynamic Battery */}
        <section className="p-4 rounded-2xl bg-[#22201e] border border-white/10 space-y-2.5 shadow-xl">
          <div className="flex items-center gap-2 text-[#c29b78] font-bold text-sm">
            <BatteryCharging className="w-4 h-4 shrink-0" />
            <span>Dynamic Continuous Battery Cell</span>
          </div>
          <p className="text-[#a3a3a3] text-xs leading-relaxed">
            Instead of locking you out for hours, DoomChess recharges progressively: exactly 1 puzzle charge every 16 minutes (~4 per hour), scaling to a full 15-charge capacity in 4 hours.
          </p>
        </section>

        {/* Support & Contact */}
        <section className="p-4 rounded-2xl bg-[#22201e] border border-white/10 flex items-center justify-between shadow-xl">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#151413] text-[#c29b78] border border-white/5">
              <Mail className="w-4 h-4 shrink-0" />
            </div>
            <div>
              <div className="font-bold text-white text-xs">Customer Support &amp; Feedback</div>
              <div className="text-[11px] text-[#a3a3a3]">{SUPPORT_EMAIL}</div>
            </div>
          </div>
          <a
            href={SUPPORT_MAILTO}
            className="px-3 py-1.5 rounded-xl bg-[#c29b78] hover:bg-[#d4b08f] text-[#0a0908] font-bold text-xs flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <span>Email</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </section>

        {/* Legal Policies */}
        <section className="grid grid-cols-2 gap-2 pt-2">
          <Link
            href="/terms"
            className="p-3 rounded-2xl bg-[#22201e] hover:bg-[#2a2624] border border-white/10 text-center text-zinc-300 text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
          >
            <FileText className="w-4 h-4 text-zinc-400" />
            <span>Terms of Service</span>
          </Link>
          <Link
            href="/privacy"
            className="p-3 rounded-2xl bg-[#22201e] hover:bg-[#2a2624] border border-white/10 text-center text-zinc-300 text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
          >
            <ShieldCheck className="w-4 h-4 text-zinc-400" />
            <span>Privacy Policy</span>
          </Link>
        </section>
      </main>
    </div>
  );
}

