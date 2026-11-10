"use client";

import React, { useState, useEffect, useRef } from "react";
import { Zap, X, AlertCircle, CheckCircle2 } from "lucide-react";
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
  const [adStatus, setAdStatus] = useState<string>("uninitialized");
  const [isAdTest, setIsAdTest] = useState<boolean>(false);
  const insRef = useRef<HTMLModElement | null>(null);

  const clientId = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID || "ca-pub-8026676969982075";
  const rewardSlotId = process.env.NEXT_PUBLIC_ADSENSE_REWARD_SLOT_ID;

  // Detect ?adtest=1 in URL
  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsAdTest(window.location.search.includes("adtest=1"));
    }
  }, [isOpen]);

  // Reset state and countdown when opening
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
  }, [isOpen]);

  // Push AdSense unit once safely (guard against React StrictMode double push)
  useEffect(() => {
    if (!isOpen) return;
    const el = insRef.current;
    if (!el) return;

    if (!el.getAttribute("data-adsbygoogle-status")) {
      try {
        const win = window as any;
        win.adsbygoogle = win.adsbygoogle || [];
        win.adsbygoogle.push({});
      } catch (err) {
        console.warn("Could not load rewarded AdSense unit:", err);
        setAdStatus("failed");
      }
    }
  }, [isOpen]);

  // Detect live AdSense render / fill status
  useEffect(() => {
    if (!isOpen) return;

    const checkStatus = () => {
      const el = insRef.current;
      if (!el) return;

      const adSenseStatus = el.getAttribute("data-ad-status");
      const googleStatus = el.getAttribute("data-adsbygoogle-status");
      const iframe = el.querySelector("iframe");

      if (adSenseStatus === "filled" || (iframe && el.clientHeight > 50)) {
        setAdStatus("filled");
      } else if (adSenseStatus === "unfilled") {
        setAdStatus("unfilled");
      } else if (googleStatus) {
        setAdStatus(googleStatus);
      } else if (iframe) {
        setAdStatus("rendering");
      }
    };

    checkStatus();
    const interval = setInterval(checkStatus, 400);

    let observer: MutationObserver | null = null;
    if (insRef.current) {
      observer = new MutationObserver(checkStatus);
      observer.observe(insRef.current, {
        attributes: true,
        attributeFilter: ["data-ad-status", "data-adsbygoogle-status", "style", "class"],
        childList: true,
        subtree: true,
      });
    }

    return () => {
      clearInterval(interval);
      if (observer) observer.disconnect();
    };
  }, [isOpen]);

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

  const isFilled = adStatus === "filled";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Rewarded Ad"
      data-testid="rewarded-ad-modal"
      className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200 select-none"
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

        {/* ?adtest=1 Diagnostic Overlay Bar */}
        {isAdTest && (
          <div
            data-testid="adsense-reward-test-overlay"
            className="w-full mb-3 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-left font-mono text-[10px] text-amber-300 leading-snug space-y-0.5 select-all"
          >
            <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-amber-400">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              <span>ADSENSE SLOT MOUNTED</span>
            </div>
            <div className="truncate text-[9.5px] text-zinc-300">
              <span className="text-zinc-500">CLIENT:</span> {clientId}{" "}
              <span className="text-zinc-500">| SLOT:</span> {rewardSlotId || "MISSING"}{" "}
              <span className="text-zinc-500">| STATUS:</span>{" "}
              <span className={isFilled ? "text-emerald-400 font-bold" : "text-amber-300 font-bold"}>
                {adStatus}
              </span>
            </div>
          </div>
        )}

        {/* Ad Container Area */}
        <div className="w-full relative min-h-[250px] flex items-center justify-center my-3">
          {/* Simulated Video / House Ad Container (Hidden if ?adtest=1 or if live ad filled) */}
          {!isAdTest && (
            <div
              className={`w-full py-6 px-4 rounded-xl bg-[#12100e] border border-white/[0.06] space-y-4 transition-opacity duration-200 ${
                isFilled
                  ? "opacity-0 pointer-events-none absolute inset-0 z-0"
                  : "relative z-0"
              }`}
            >
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

          {/* Live Google AdSense container: Always rendered with explicit block dimensions */}
          <div
            className={`w-full min-h-[250px] flex items-center justify-center ${
              isAdTest
                ? "relative z-10 p-2 rounded-xl border border-dashed border-amber-500/40 bg-zinc-950/80"
                : isFilled
                ? "relative z-10"
                : "absolute inset-0 opacity-0 pointer-events-none"
            }`}
          >
            <ins
              ref={insRef}
              className="adsbygoogle"
              style={{ display: "block", width: "100%", minHeight: "250px" }}
              data-ad-client={clientId}
              data-ad-slot={rewardSlotId}
              data-ad-format="auto"
              data-full-width-responsive="true"
              {...(isAdTest ? { "data-adtest": "on" } : {})}
            />
          </div>
        </div>

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
                Forfeit &amp; Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
