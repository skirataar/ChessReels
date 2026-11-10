"use client";

import React from "react";
import { LogIn, Sparkles, Zap, Target, Trophy, ArrowRight } from "lucide-react";
import { AnimatedChessHero } from "./AnimatedChessHero";

interface LandingPageProps {
  onContinueWithGoogle?: () => void;
  onOpenRegister?: (prefill?: string) => void;
  onOpenLogin: () => void;
  onClose?: () => void;
}

export function LandingPage({
  onContinueWithGoogle,
  onOpenRegister,
  onOpenLogin,
}: LandingPageProps) {
  return (
    <div className="min-h-screen bg-[#0e0d0c] font-sans text-[#f5f5f5] selection:bg-[#c29b78] selection:text-[#0f0e0d] flex flex-col justify-between items-center px-4 py-6 sm:py-8 relative overflow-hidden">
      {/* Background radial ambient glow accents */}
      <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[500px] h-[350px] rounded-full bg-gradient-to-b from-amber-500/15 via-[#c29b78]/5 to-transparent blur-[100px] pointer-events-none" />
      <div className="absolute bottom-10 -right-20 w-80 h-80 rounded-full bg-[#c29b78]/10 blur-[110px] pointer-events-none" />
      <div className="absolute top-1/2 -left-24 w-72 h-72 rounded-full bg-amber-600/10 blur-[100px] pointer-events-none" />

      {/* Subtle tactical grid background pattern */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.035]"
        style={{
          backgroundImage:
            "linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      {/* Top Header Bar */}
      <header className="w-full max-w-md mx-auto flex items-center justify-between z-20 mb-4 sm:mb-6">
        <div className="flex items-center gap-2">
          <img
            src="/icons/icon.svg"
            alt="DoomChess"
            className="h-9 w-9 rounded-xl object-contain shadow-lg shadow-amber-500/20"
          />
          <div>
            <span className="text-lg font-black tracking-tight text-white">
              Doom<span className="text-[#c29b78]">Chess</span>
            </span>
          </div>
        </div>

        {/* Live database badge */}
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#1c1a18] border border-white/10 text-[11px] font-semibold text-zinc-300 shadow-md">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>6.15M Tactics</span>
        </div>
      </header>

      {/* Main Hero & Reel Presentation */}
      <main className="w-full max-w-md mx-auto flex flex-col items-center justify-center relative z-10 flex-1 my-auto">
        {/* Value Prop Headline */}
        <div className="text-center mb-3 sm:mb-4 px-2">
          <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[11px] font-bold mb-2 shadow-sm">
            <Sparkles className="w-3 h-3 text-amber-400" />
            <span>Short-form Chess Tactics</span>
          </div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-black tracking-tight text-white leading-tight">
            Turn Doomscrolling into <span className="bg-gradient-to-r from-amber-300 via-[#d4b08f] to-amber-500 bg-clip-text text-transparent">Grandmaster Instinct</span>
          </h1>
          <p className="text-xs text-zinc-400 mt-1 max-w-xs mx-auto font-medium leading-relaxed">
            Swipe through rapid-fire tactical puzzles tailored to your Elo.
          </p>
        </div>

        {/* Animated Vertical Reel Showcase */}
        <div className="w-full mb-4">
          <AnimatedChessHero />
        </div>

        {/* Primary Action Section */}
        <div className="w-full space-y-2.5 px-1">
          {/* 1. Get Started (Enter Onboarding Calibration) */}
          <button
            onClick={() => {
              if (typeof window !== "undefined") {
                window.location.href = "/";
              }
            }}
            type="button"
            className="w-full h-11 rounded-2xl bg-[#c29b78] hover:bg-[#d4b08f] text-[#0a0908] font-bold text-xs sm:text-sm tracking-wide transition-all duration-150 ease-out flex items-center justify-center gap-2 shadow-xl shadow-[#c29b78]/25 active:scale-[0.98] cursor-pointer"
          >
            <span>Get Started</span>
            <ArrowRight className="w-4 h-4 stroke-[2.5]" />
          </button>

          {/* 2. Log In Button */}
          <button
            onClick={onOpenLogin}
            type="button"
            className="w-full h-11 rounded-2xl bg-[#1e1c1a] hover:bg-[#282522] border border-white/15 hover:border-[#c29b78]/50 text-white font-bold text-xs sm:text-sm transition-all duration-150 ease-out flex items-center justify-center gap-2 shadow-xl shadow-black/60 active:scale-[0.98] cursor-pointer"
          >
            <LogIn className="w-4 h-4 stroke-[2.5]" />
            <span>Sign In</span>
          </button>
        </div>

        {/* Create Account Link */}
        {onOpenRegister && (
          <div className="mt-3 text-center">
            <span className="text-xs text-zinc-400">
              Don&apos;t have an account?{" "}
            </span>
            <button
              onClick={() => onOpenRegister()}
              className="text-xs font-bold text-amber-400 hover:text-amber-300 transition-colors cursor-pointer underline underline-offset-4"
            >
              Create Free Account
            </button>
          </div>
        )}

        {/* Feature Highlights Grid */}
        <div className="w-full grid grid-cols-3 gap-2 mt-4 text-center">
          <div className="py-2 px-1.5 rounded-xl bg-[#171514] border border-white/5 flex flex-col items-center">
            <Zap className="w-3.5 h-3.5 text-amber-400 mb-0.5" />
            <div className="text-[10px] font-bold text-zinc-200">Tactical Feed</div>
            <div className="text-[9px] text-zinc-400">Swipe tactics</div>
          </div>

          <div className="py-2 px-1.5 rounded-xl bg-[#171514] border border-white/5 flex flex-col items-center">
            <Trophy className="w-3.5 h-3.5 text-amber-400 mb-0.5" />
            <div className="text-[10px] font-bold text-zinc-200">Live Elo</div>
            <div className="text-[9px] text-zinc-400">Auto-calibrated</div>
          </div>

          <div className="py-2 px-1.5 rounded-xl bg-[#171514] border border-white/5 flex flex-col items-center">
            <Target className="w-3.5 h-3.5 text-amber-400 mb-0.5" />
            <div className="text-[10px] font-bold text-zinc-200">6.15M Bank</div>
            <div className="text-[9px] text-zinc-400">Zero repetition</div>
          </div>
        </div>
      </main>


      {/* Footer */}
      <footer className="w-full max-w-md mx-auto text-center mt-6 z-20">
        <p className="text-[11px] text-zinc-400 font-medium">
          6,157,341 Puzzles • Layerbase Postgres • Better Auth
        </p>
      </footer>
    </div>
  );
}
