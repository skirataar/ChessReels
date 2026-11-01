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
    sounds.playSuccess();

    // Trigger victory confetti burst
    confetti({
      particleCount: 120,
      spread: 80,
      origin: { y: 0.6 },
      colors: ["#4edea3", "#10b981", "#ffb95f", "#ffffff"],
    });
  }, [isOpen]);

  if (!isOpen) return null;

  const tier = getTier(calibratedElo);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="w-full max-w-sm rounded-2xl bg-[#121214] border border-[#4edea3]/40 shadow-[0_0_50px_rgba(78,222,163,0.25)] overflow-hidden text-center p-6 space-y-5 animate-in zoom-in-95 duration-200 relative"
        role="dialog"
        aria-modal="true"
      >
        <div className="absolute top-0 right-0 w-40 h-40 bg-[#4edea3]/10 rounded-full blur-3xl pointer-events-none" />

        {/* Animated Trophy Hero Icon */}
        <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#10b981] to-[#4edea3] flex items-center justify-center text-[#002113] shadow-[0_0_25px_rgba(78,222,163,0.5)]">
          <Trophy className="w-8 h-8" />
        </div>

        <div>
          <span className="text-[11px] font-bold uppercase tracking-widest text-[#4edea3] block mb-1">
            Skill Baseline Established
          </span>
          <h2 className="text-xl font-black text-white tracking-tight">
            Calibration Complete!
          </h2>
          <p className="text-xs text-[#bbcabf] mt-1">
            Great tactical work, <span className="text-white font-bold">{username}</span>!
          </p>
        </div>

        {/* Calibrated Elo & Tier Card */}
        <div className="p-4 rounded-xl bg-[#18181B] border border-white/10 space-y-2">
          <div className="flex items-center justify-center gap-1.5 text-3xl font-black text-[#4edea3] tracking-tight">
            <Zap className="w-6 h-6 fill-[#4edea3]" />
            <span>{calibratedElo}</span>
            <span className="text-sm font-semibold text-[#bbcabf]">Elo</span>
          </div>

          <div className="flex items-center justify-center gap-2">
            <span
              className="text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full shadow-sm"
              style={{ color: tier.color, backgroundColor: tier.bg }}
            >
              {tier.name} Division
            </span>
          </div>

          <p className="text-[11px] text-[#bbcabf] pt-1">
            Continuous puzzle reels are now personalized to match your tactical baseline.
          </p>
        </div>

        <button
          onClick={onClose}
          className="w-full py-3.5 rounded-xl bg-[#4edea3] hover:bg-[#10b981] text-[#002113] font-black text-xs uppercase tracking-wider transition-all cursor-pointer shadow-lg flex items-center justify-center gap-2 active:scale-98"
        >
          <span>Start Tactical Reels</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
