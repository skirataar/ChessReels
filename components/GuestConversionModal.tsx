"use client";

import React from "react";
import { ArrowRight, Trophy } from "lucide-react";
import { markGuestMode } from "@/lib/placementEngine";

export interface GuestConversionModalProps {
  isOpen: boolean;
  calibratedElo?: number;
  guestElo?: number;
  onSaveRating?: () => void;
  onSaveProgress?: () => void;
  onContinueAsGuest: () => void;
}

export function GuestConversionModal({
  isOpen,
  calibratedElo,
  guestElo,
  onSaveRating,
  onSaveProgress,
  onContinueAsGuest,
}: GuestConversionModalProps) {
  if (!isOpen) return null;

  const displayElo = calibratedElo || guestElo || 1000;
  const handlePrimary = onSaveRating || onSaveProgress || (() => {});

  const handleSecondary = () => {
    markGuestMode(true);
    onContinueAsGuest();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="calibration-complete-title"
      data-testid="calibration-complete-screen"
    >
      <div className="bg-[#0a0908] border border-[#c29b78]/40 backdrop-blur-xl p-6 rounded-2xl max-w-sm w-full mx-auto text-center shadow-2xl space-y-5 animate-in zoom-in-95 duration-200">
        {/* Clean Gold Vector Trophy Badge */}
        <div className="w-14 h-14 mx-auto rounded-xl bg-[#c29b78]/10 border border-[#c29b78]/30 flex items-center justify-center text-[#c29b78] shadow-lg shadow-[#c29b78]/10">
          <Trophy className="w-7 h-7" strokeWidth={1.8} />
        </div>

        {/* Text Content */}
        <div className="space-y-2">
          <span className="text-[10px] tracking-[0.2em] uppercase text-[#c29b78] font-bold block">
            Placement Test Completed
          </span>
          <h2
            id="calibration-complete-title"
            className="text-xl font-bold text-[#f5f2eb] tracking-tight"
          >
            Calibration Complete: {displayElo} ELO
          </h2>
          <p className="text-xs text-zinc-400 leading-relaxed px-1">
            Calculated from your accuracy and blunder recovery across 6 placement positions.
          </p>
        </div>

        {/* Actions */}
        <div className="space-y-2.5 pt-2">
          <button
            type="button"
            data-testid="save-rating-create-account-btn"
            onClick={handlePrimary}
            className="w-full h-11 rounded-xl bg-[#c29b78] hover:bg-[#d4b08f] text-[#0a0908] font-bold text-xs uppercase tracking-wider transition-all duration-150 active:scale-[0.98] shadow-lg shadow-[#c29b78]/20 flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Save Rating &amp; Create Account</span>
            <ArrowRight className="w-4 h-4 stroke-[2.5]" />
          </button>

          <button
            type="button"
            data-testid="continue-unranked-guest-btn"
            onClick={handleSecondary}
            className="w-full py-2.5 text-xs text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer block font-medium"
          >
            Continue Unranked as Guest
          </button>
        </div>
      </div>
    </div>
  );
}
