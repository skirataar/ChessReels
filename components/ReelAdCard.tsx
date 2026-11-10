"use client";

import React, { useEffect, useRef, useState } from "react";
import { ChevronDown, ArrowRight, Sparkles } from "lucide-react";

interface ReelAdCardProps {
  isPro?: boolean;
  onContinue: () => void;
  onUpgradeToPro: () => void;
}

export function ReelAdCard({
  isPro = false,
  onContinue,
  onUpgradeToPro,
}: ReelAdCardProps) {
  const [adSenseFailed, setAdSenseFailed] = useState(false);
  const [isAdFilled, setIsAdFilled] = useState(false);
  const [adLockSeconds, setAdLockSeconds] = useState(3);
  const insRef = useRef<HTMLModElement | null>(null);
  const touchStartY = useRef<number | null>(null);

  const clientId = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID;
  const reelSlotId = process.env.NEXT_PUBLIC_ADSENSE_REEL_SLOT_ID;
  const hasLiveAdSense = Boolean(clientId && reelSlotId && !adSenseFailed);

  // 3-second mandatory countdown timer
  useEffect(() => {
    if (adLockSeconds <= 0) return;
    const timer = setInterval(() => {
      setAdLockSeconds((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [adLockSeconds]);

  // Push AdSense unit if present
  useEffect(() => {
    if (isPro) return;
    if (hasLiveAdSense) {
      try {
        const win = window as any;
        win.adsbygoogle = win.adsbygoogle || [];
        win.adsbygoogle.push({});
      } catch (err) {
        console.warn("Could not push AdSense unit:", err);
        setAdSenseFailed(true);
      }
    }
  }, [hasLiveAdSense, isPro]);

  // Detect whether AdSense actually filled or if empty
  useEffect(() => {
    if (isPro || !hasLiveAdSense) return;

    const checkFill = () => {
      const el = insRef.current;
      if (!el) return;
      const status = el.getAttribute("data-ad-status");
      if (status === "filled") {
        setIsAdFilled(true);
        return;
      }
      if (status === "unfilled") {
        setIsAdFilled(false);
        return;
      }
      // Check for filled iframe
      const iframe = el.querySelector("iframe");
      if (iframe && el.clientHeight > 50) {
        setIsAdFilled(true);
      }
    };

    checkFill();
    const interval = setInterval(checkFill, 500);

    let observer: MutationObserver | null = null;
    if (insRef.current) {
      observer = new MutationObserver(checkFill);
      observer.observe(insRef.current, {
        attributes: true,
        attributeFilter: ["data-ad-status", "style", "class"],
        childList: true,
        subtree: true,
      });
    }

    return () => {
      clearInterval(interval);
      if (observer) observer.disconnect();
    };
  }, [hasLiveAdSense, isPro]);

  // Window-level key event locking while countdown active; advance when unlocked
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isNavKey =
        ["ArrowDown", "ArrowUp", "Space", "PageDown", "PageUp", "j", "k"].includes(e.code) ||
        ["ArrowDown", "ArrowUp", " ", "Enter"].includes(e.key);

      if (!isNavKey) return;

      if (adLockSeconds > 0) {
        e.preventDefault();
        e.stopPropagation();
      } else if (
        ["ArrowDown", "PageDown", " ", "Enter", "j"].includes(e.key) ||
        e.code === "Space"
      ) {
        e.preventDefault();
        onContinue();
      }
    };

    window.addEventListener("keydown", handleKeyDown, { capture: true });
    return () => window.removeEventListener("keydown", handleKeyDown, { capture: true });
  }, [adLockSeconds, onContinue]);

  // Touch handlers for swipe detection and blocking
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (adLockSeconds > 0) {
      if (e.cancelable) e.preventDefault();
      e.stopPropagation();
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (adLockSeconds > 0) {
      e.stopPropagation();
      return;
    }
    if (touchStartY.current === null) return;
    const deltaY = touchStartY.current - e.changedTouches[0].clientY;
    // Swipe up to continue to next puzzle
    if (deltaY > 50) {
      onContinue();
    }
    touchStartY.current = null;
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (adLockSeconds > 0) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    if (e.deltaY > 30) {
      onContinue();
    }
  };

  // Strict Pro Bypass: Never render any ad for Pro accounts
  if (isPro) {
    return null;
  }

  return (
    <div
      data-testid="between-reels-ad-card"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onWheel={handleWheel}
      className="w-full flex-1 flex flex-col justify-center items-center px-4 py-6 mx-auto select-none"
    >
      <div className="w-full max-w-md mx-auto rounded-2xl overflow-hidden bg-[#0a0908] border border-[#c29b78]/25 shadow-2xl flex flex-col relative">
        {/* Top Header Bar */}
        <div className="w-full flex items-center justify-between px-5 py-3.5 bg-white/[0.02] border-b border-white/[0.06]">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#c29b78] animate-pulse" />
            <span className="text-[11px] tracking-wider text-[#c29b78] font-bold uppercase">
              AD BREAK
            </span>
          </div>
          <span className="text-[10px] tracking-widest text-zinc-500 uppercase font-mono font-bold">
            SPONSORED
          </span>
        </div>

        {/* Ad Body (Native House Ad Base Layer + Optional Live AdSense Overlay) */}
        <div className="p-6 flex flex-col items-center text-center">
          <div className="w-full relative min-h-[250px] flex items-center justify-center">
            {/* Native Pro House Ad: always visible unless AdSense has successfully filled */}
            {!isAdFilled && (
              <div className="my-2 space-y-4 max-w-sm w-full animate-in fade-in duration-200">
                <div className="w-14 h-14 rounded-2xl bg-[#c29b78]/10 border border-[#c29b78]/25 flex items-center justify-center mx-auto text-[#c29b78] shadow-lg shadow-[#c29b78]/5">
                  <Sparkles className="w-7 h-7 stroke-[1.8]" />
                </div>

                <div className="space-y-1.5">
                  <h3 className="text-base font-bold text-[#f5f2eb] tracking-tight">
                    DoomChess Pro Experience
                  </h3>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    Tired of battery limits? Unlock Infinite Charge, Zero Ads &amp; Opening Repertoire Drills.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={onUpgradeToPro}
                  className="w-full py-3 px-4 rounded-xl bg-[#c29b78] hover:bg-[#dfb48c] text-[#0a0908] font-black text-xs tracking-wider uppercase transition-all shadow-lg shadow-[#c29b78]/15 flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                >
                  <span>UPGRADE TO PRO</span>
                  <ArrowRight className="w-4 h-4 stroke-[2.4]" />
                </button>
              </div>
            )}

            {/* Live Google AdSense container */}
            {hasLiveAdSense && (
              <div
                className={
                  isAdFilled
                    ? "w-full my-2 min-h-[250px] flex items-center justify-center"
                    : "absolute inset-0 opacity-0 pointer-events-none"
                }
              >
                <ins
                  ref={insRef}
                  className="adsbygoogle"
                  style={{ display: "block", width: "100%", height: "250px" }}
                  data-ad-client={clientId}
                  data-ad-slot={reelSlotId}
                  data-ad-format="auto"
                  data-full-width-responsive="true"
                />
              </div>
            )}
          </div>

          {/* Continue / Next Puzzle Button with 3-Second Mandatory Lock */}
          <div className="w-full pt-4 mt-2 border-t border-white/[0.06]">
            {adLockSeconds > 0 ? (
              <button
                type="button"
                disabled={true}
                data-testid="ad-continue-locked-btn"
                className="w-full py-2.5 px-4 rounded-xl opacity-50 cursor-not-allowed bg-zinc-900/60 text-zinc-500 border border-white/5 font-semibold text-xs transition-colors flex items-center justify-center gap-2 select-none"
              >
                <span>Continue in {adLockSeconds}s...</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onContinue}
                data-testid="ad-continue-next-reel-btn"
                className="group w-full py-2.5 px-4 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-[#c29b78]/30 hover:border-[#c29b78]/60 text-[#f5f2eb] font-semibold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98 shadow-sm"
              >
                <span>Continue / Next Puzzle</span>
                <ChevronDown className="w-4 h-4 text-zinc-400 group-hover:text-amber-300 transition-colors stroke-[2.2]" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
