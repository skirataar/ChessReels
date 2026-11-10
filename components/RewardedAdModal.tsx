"use client";

import React, { useState, useEffect } from "react";
import { Zap, X, AlertCircle, CheckCircle2, ShieldCheck, Sparkles } from "lucide-react";
import { sounds } from "@/lib/audio";
import { haptics } from "@/lib/haptics";

interface RewardedAdModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRewardEarned: (data: { puzzlesRemaining: number; nextQuotaRefillTime: string | null }) => void;
  userId?: string;
  currentPuzzlesRemaining?: number;
}

export function RewardedAdModal({
  isOpen,
  onClose,
  onRewardEarned,
  userId,
  currentPuzzlesRemaining = 0,
}: RewardedAdModalProps) {
  const [secondsLeft, setSecondsLeft] = useState<number>(15);
  const [isClaiming, setIsClaiming] = useState<boolean>(false);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [showForfeitPrompt, setShowForfeitPrompt] = useState<boolean>(false);
  const [adSenseFailed, setAdSenseFailed] = useState<boolean>(false);

  const clientId = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID;
  const rewardSlotId = process.env.NEXT_PUBLIC_ADSENSE_REWARD_SLOT_ID;
  const hasLiveAdSense = Boolean(clientId && rewardSlotId && !adSenseFailed);

  // Reset state when opening
  useEffect(() => {
    if (!isOpen) {
      setSecondsLeft(15);
      setIsClaiming(false);
      setIsSuccess(false);
      setShowForfeitPrompt(false);
      return;
    }

    setSecondsLeft(15);
    setIsClaiming(false);
    setIsSuccess(false);
    setShowForfeitPrompt(false);

    if (hasLiveAdSense) {
      try {
        const win = window as any;
        win.adsbygoogle = win.adsbygoogle || [];
        win.adsbygoogle.push({});
      } catch (err) {
        console.warn("Could not load rewarded AdSense unit:", err);
        setAdSenseFailed(true);
      }
    }

    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen, hasLiveAdSense]);

  // When timer hits 0, trigger reward
  useEffect(() => {
    if (secondsLeft === 0 && !isClaiming && !isSuccess && isOpen) {
      claimReward();
    }
  }, [secondsLeft, isOpen]);

  const claimReward = async () => {
    setIsClaiming(true);
    try {
      const res = await fetch("/api/user/quota/reward-ad", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          currentPuzzlesRemaining,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setIsSuccess(true);
        sounds.playSuccess();
        haptics.success();
        onRewardEarned({
          puzzlesRemaining: data.puzzlesRemaining,
          nextQuotaRefillTime: data.nextQuotaRefillTime || null,
        });
        setTimeout(() => {
          onClose();
        }, 1200);
      } else {
        // Fallback optimistic increment
        const nextCount = Math.min(15, currentPuzzlesRemaining + 3);
        setIsSuccess(true);
        sounds.playSuccess();
        haptics.success();
        onRewardEarned({
          puzzlesRemaining: nextCount,
          nextQuotaRefillTime: null,
        });
        setTimeout(() => {
          onClose();
        }, 1200);
      }
    } catch {
      const nextCount = Math.min(15, currentPuzzlesRemaining + 3);
      setIsSuccess(true);
      sounds.playSuccess();
      haptics.success();
      onRewardEarned({
        puzzlesRemaining: nextCount,
        nextQuotaRefillTime: null,
      });
      setTimeout(() => {
        onClose();
      }, 1200);
    } finally {
      setIsClaiming(false);
    }
  };

  const handleAttemptClose = () => {
    if (secondsLeft > 0 && !isSuccess) {
      setShowForfeitPrompt(true);
    } else {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Rewarded Ad"
      data-testid="rewarded-ad-modal"
      className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
    >
      <div className="w-full max-w-sm rounded-2xl bg-[#0a0908] border border-[#c29b78]/30 shadow-2xl p-6 relative flex flex-col items-center text-center overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Top Header Row with Countdown and Close Button */}
        <div className="w-full flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#c29b78] animate-ping" />
            <span className="text-[10px] tracking-widest text-zinc-400 font-bold uppercase">
              Battery Recharge
            </span>
          </div>

          <div className="flex items-center gap-2">
            {!isSuccess && (
              <span
                data-testid="reward-countdown-pill"
                className="bg-[#c29b78]/15 border border-[#c29b78]/30 text-[#c29b78] text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-full"
              >
                Reward in {secondsLeft}s...
              </span>
            )}
            <button
              onClick={handleAttemptClose}
              aria-label="Close ad"
              data-testid="rewarded-ad-close-btn"
              className="w-7 h-7 rounded-lg flex items-center justify-center text-[#78716c] hover:text-[#f5f2eb] hover:bg-white/[0.04] transition-colors cursor-pointer"
            >
              <X className="w-4 h-4 stroke-[1.8]" />
            </button>
          </div>
        </div>

        {/* Ad Container */}
        {hasLiveAdSense ? (
          <div className="w-full my-4 min-h-[250px] flex items-center justify-center">
            <ins
              className="adsbygoogle"
              style={{ display: "block", width: "100%", height: "250px" }}
              data-ad-client={clientId}
              data-ad-slot={rewardSlotId}
              data-ad-format="auto"
              data-full-width-responsive="true"
            />
          </div>
        ) : (
          /* Simulated Dark-Luxury Interactive / Video Ad Container */
          <div className="w-full my-3 py-6 px-4 rounded-xl bg-[#12100e] border border-white/[0.06] space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-[#c29b78]/10 border border-[#c29b78]/25 flex items-center justify-center mx-auto text-[#c29b78]">
              {isSuccess ? (
                <CheckCircle2 className="w-8 h-8 text-[#c29b78] stroke-[2]" />
              ) : (
                <Zap className="w-7 h-7 text-[#c29b78] fill-[#c29b78] animate-pulse" />
              )}
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-bold text-[#f5f2eb] tracking-tight">
                {isSuccess
                  ? "Reward Claimed: +3 Puzzles Added!"
                  : "DoomChess Tactical Intelligence"}
              </h3>
              <p className="text-xs text-zinc-400 leading-relaxed max-w-xs mx-auto">
                {isSuccess
                  ? "Your liquid battery has been replenished. Jump straight back into tactical puzzles."
                  : "Master 20,000+ GM-level tactical puzzles with instant feedback and adaptive Elo."}
              </p>
            </div>

            {/* Simulated Video Progress Bar */}
            <div className="w-full bg-zinc-800/80 h-1.5 rounded-full overflow-hidden relative">
              <div
                className="h-full bg-[#c29b78] transition-all duration-1000 ease-linear"
                style={{ width: `${((15 - secondsLeft) / 15) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Forfeit Confirmation Prompt Overlay */}
        {showForfeitPrompt && (
          <div className="absolute inset-0 bg-[#0a0908]/95 backdrop-blur-md p-6 flex flex-col items-center justify-center text-center z-20 animate-in fade-in duration-150">
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/25 flex items-center justify-center text-rose-400 mb-3">
              <AlertCircle className="w-5 h-5 stroke-[2]" />
            </div>
            <h4 className="text-sm font-bold text-[#f5f2eb] mb-1">
              Forfeit Reward?
            </h4>
            <p className="text-xs text-zinc-400 mb-5 max-w-xs">
              Close now and forfeit your +3 puzzle recharge?
            </p>
            <div className="flex gap-2.5 w-full">
              <button
                onClick={() => setShowForfeitPrompt(false)}
                className="flex-1 py-2.5 rounded-xl bg-[#c29b78] hover:bg-[#dfb48c] text-[#0a0908] font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer"
              >
                Keep Watching
              </button>
              <button
                onClick={onClose}
                className="flex-1 py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-zinc-300 font-semibold text-xs transition-colors cursor-pointer"
              >
                Forfeit & Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

