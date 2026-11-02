"use client";

import React, { useState, useEffect } from "react";
import { Crown, Sparkles, Volume2, ArrowRight, ShieldCheck, Zap } from "lucide-react";

interface AdModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpgradeToPro: () => void;
  proPrice?: number;
}

export function AdModal({
  isOpen,
  onClose,
  onUpgradeToPro,
  proPrice = 200,
}: AdModalProps) {
  const [secondsRemaining, setSecondsRemaining] = useState<number>(3);
  const [canSkip, setCanSkip] = useState<boolean>(false);

  useEffect(() => {
    if (!isOpen) {
      setSecondsRemaining(3);
      setCanSkip(false);
      return;
    }

    setSecondsRemaining(3);
    setCanSkip(false);

    const interval = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setCanSkip(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Sponsored Reel"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div className="w-full max-w-sm flex flex-col rounded-3xl bg-[#181614] border border-amber-500/30 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 text-white relative">
        {/* Top Ad Banner Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-[#22201e] border-b border-white/10">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
            <span className="text-[11px] font-black tracking-wider uppercase text-amber-300">
              Sponsored Break • Ad 1 of 1
            </span>
          </div>

          <div>
            {canSkip ? (
              <button
                onClick={onClose}
                aria-label="Skip Ad"
                className="px-2.5 py-1 rounded-full bg-white/10 hover:bg-white/20 text-white text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1 active:scale-95"
              >
                <span>Skip</span>
                <span>✕</span>
              </button>
            ) : (
              <span className="text-[11px] font-mono font-bold text-zinc-400 bg-black/40 px-2 py-0.5 rounded-full border border-white/5">
                Skip in {secondsRemaining}s
              </span>
            )}
          </div>
        </div>

        {/* Sponsor Content Body */}
        <div className="p-5 flex flex-col items-center text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500/20 to-[#c29b78]/30 border border-amber-500/40 flex items-center justify-center shadow-lg shadow-amber-500/10">
            <Sparkles className="w-8 h-8 text-amber-400" />
          </div>

          <div className="space-y-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400/90 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
              Grandmaster Partner
            </span>
            <h2 className="text-lg font-black tracking-tight text-white">
              Tactical Intuition Masterclass
            </h2>
            <p className="text-xs text-zinc-400 leading-relaxed px-2">
              Unlock tournament-grade pattern recognition with interactive 3D variations and grandmaster game analysis.
            </p>
          </div>

          <div className="w-full p-3 rounded-2xl bg-zinc-900/80 border border-white/5 flex items-center justify-between text-left">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-zinc-800 flex items-center justify-center text-amber-300 font-bold text-sm">
                ♔
              </div>
              <div>
                <div className="text-xs font-bold text-zinc-200">
                  Daily GM Puzzles
                </div>
                <div className="text-[10px] text-zinc-500">
                  Included with Partner Access
                </div>
              </div>
            </div>
            <span className="text-xs font-bold text-emerald-400">
              Free Trial
            </span>
          </div>

          {/* Continue / Skip Button */}
          <button
            onClick={onClose}
            disabled={!canSkip}
            className={`w-full py-3 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1.5 ${
              canSkip
                ? "bg-zinc-800 hover:bg-zinc-700 text-white cursor-pointer active:scale-98"
                : "bg-zinc-900 text-zinc-500 cursor-not-allowed opacity-60"
            }`}
          >
            <span>{canSkip ? "Continue to Next Puzzle" : `Ad finishes in ${secondsRemaining}s...`}</span>
            {canSkip && <ArrowRight className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Pro Upsell Strip */}
        <div className="px-5 py-3.5 bg-gradient-to-r from-amber-950/40 to-zinc-900 border-t border-amber-500/20 flex flex-col sm:flex-row items-center justify-between gap-2.5">
          <div className="flex items-center gap-2 text-left">
            <Crown className="w-4 h-4 text-amber-400 shrink-0" />
            <div className="text-[11px]">
              <span className="font-bold text-white">Tired of ads? </span>
              <span className="text-zinc-400">Unlimited reels from ₹190/mo (Save 5%).</span>
            </div>
          </div>

          <button
            onClick={() => {
              onUpgradeToPro();
              onClose();
            }}
            className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-400 to-[#c29b78] hover:from-amber-300 hover:to-[#dfba94] text-zinc-950 font-black text-xs transition-all shadow-md shadow-amber-500/20 shrink-0 cursor-pointer active:scale-95"
          >
            Upgrade (₹{Math.round(proPrice)}/mo)
          </button>
        </div>
      </div>
    </div>
  );
}
