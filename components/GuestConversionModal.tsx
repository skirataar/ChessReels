"use client";

import React from "react";
import { ArrowRight } from "lucide-react";

export interface GuestConversionModalProps {
  isOpen: boolean;
  guestElo: number;
  onSaveProgress: () => void;
  onContinueAsGuest: () => void;
}

export function GuestConversionModal({
  isOpen,
  guestElo,
  onSaveProgress,
  onContinueAsGuest,
}: GuestConversionModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="conversion-modal-title"
    >
      <div className="bg-[#0a0908]/95 border border-[#c29b78]/40 backdrop-blur-xl p-6 rounded-none max-w-sm w-full mx-auto text-center shadow-2xl space-y-5 animate-in zoom-in-95 duration-200">
        {/* Clean Gold Vector Trophy Badge */}
        <div className="w-14 h-14 mx-auto rounded-full bg-[#c29b78]/10 border border-[#c29b78]/30 flex items-center justify-center text-[#c29b78] shadow-lg shadow-[#c29b78]/10">
          <svg
            className="w-7 h-7"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
            <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
            <path d="M4 22h16" />
            <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
            <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
            <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
          </svg>
        </div>

        {/* Text Content */}
        <div className="space-y-2">
          <h2
            id="conversion-modal-title"
            className="text-lg font-bold text-zinc-100 tracking-tight"
          >
            Rating Calibrated: {guestElo} ELO
          </h2>
          <p className="text-xs text-zinc-400 leading-relaxed">
            You solved 3 consecutive puzzles. Create an account or sign in to save your progress, unlock your streak, and access full tactical repertoires.
          </p>
        </div>

        {/* Actions */}
        <div className="space-y-2.5 pt-2">
          <button
            type="button"
            onClick={onSaveProgress}
            className="w-full h-11 rounded-none bg-[#c29b78] hover:bg-[#d4b08f] text-[#0a0908] font-bold text-xs uppercase tracking-wider transition-all duration-150 active:scale-[0.98] shadow-lg shadow-[#c29b78]/20 flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Save My Progress</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={onContinueAsGuest}
            className="w-full py-2 text-[11px] text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer block"
          >
            Continue as Guest (Scores Won&apos;t Be Ranked)
          </button>
        </div>
      </div>
    </div>
  );
}

