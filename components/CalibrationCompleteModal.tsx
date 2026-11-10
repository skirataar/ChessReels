"use client";

import React, { useEffect } from "react";
import confetti from "canvas-confetti";
import { Trophy, Zap, ArrowRight } from "lucide-react";
import { getTier } from "./LeaderboardModal";
import { sounds } from "@/lib/audio";

interface CalibrationCompleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  calibratedElo: number;
  username: string;
}

export function CalibrationCompleteModal({
  isOpen,
  onClose,
  calibratedElo,
  username,
}: CalibrationCompleteModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    try {
      sounds.playSuccess();
    } catch {
      // Audio autoplay may be silenced by browser policy
    }

    // Trigger subtle gold/champagne victory confetti burst
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ["#c29b78", "#dfb48c", "#f5f2eb", "#a8a29e"],
      });
    } catch {
      // Confetti fallback
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const tier = getTier(calibratedElo);

  return (
    <div
      data-testid="calibration-complete-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div
        data-testid="calibration-complete-modal"
        className="bg-[#12100e] border border-white/[0.08] rounded-2xl p-6 shadow-2xl max-w-[360px] w-full text-center relative animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        {/* Top Minimal Flush Icon */}
        <div className="w-12 h-12 rounded-xl bg-[#c29b78]/10 border border-[#c29b78]/20 flex items-center justify-center mx-auto mb-4">
          <Trophy className="w-5 h-5 text-[#c29b78]" strokeWidth={1.5} />
        </div>

        {/* Header Typography */}
        <div className="space-y-1">
          <span className="text-[10px] tracking-[0.2em] uppercase text-[#c29b78] font-medium block">
            SKILL BASELINE ESTABLISHED
          </span>
          <h2 className="text-xl font-semibold text-[#f5f2eb] tracking-tight">
            Calibration Complete
          </h2>
          <p className="text-xs text-[#78716c]">
            Great tactical work, <span className="text-[#f5f2eb] font-medium">{username}</span>!
          </p>
        </div>

        {/* Elo Showcase Box */}
        <div className="bg-[#0a0908] border border-white/[0.06] rounded-xl p-4 my-5 space-y-2">
          <div className="flex items-center justify-center gap-2">
            <Zap className="w-5 h-5 text-[#c29b78] fill-[#c29b78]" />
            <span className="text-3xl font-bold text-[#f5f2eb] tabular-nums tracking-tight">
              {calibratedElo}
            </span>
            <span className="text-xs font-medium text-[#78716c]">Elo</span>
          </div>

          <div className="flex items-center justify-center pt-0.5">
            <span className="bg-white/[0.04] text-[#c29b78] text-[10px] tracking-widest uppercase px-2.5 py-0.5 rounded-md border border-white/[0.06] font-medium">
              {tier.name} Division
            </span>
          </div>

          <p className="text-[11px] text-[#78716c] pt-1 leading-relaxed">
            Continuous tactical puzzles are now personalized to match your tactical baseline.
          </p>
        </div>

        {/* Primary CTA Button */}
        <button
          data-testid="calibration-start-reels-btn"
          onClick={onClose}
          className="w-full py-3 rounded-xl bg-[#c29b78] hover:bg-[#d4af8c] active:scale-[0.99] text-[#0a0908] font-semibold text-xs tracking-wide uppercase transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-lg shadow-[#c29b78]/10"
        >
          <span>Start Tactical Puzzles</span>
          <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
        </button>
      </div>
    </div>
  );
}
