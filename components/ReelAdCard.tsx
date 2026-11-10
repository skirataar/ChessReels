"use client";

import React, { useEffect, useState } from "react";
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

  const clientId = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID;
  const reelSlotId = process.env.NEXT_PUBLIC_ADSENSE_REEL_SLOT_ID;
  const hasLiveAdSense = Boolean(clientId && reelSlotId && !adSenseFailed);

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

  // Strict Pro Bypass: Never render any ad for Pro accounts
  if (isPro) {
    return null;
  }

  return (
    <div
      data-testid="between-reels-ad-card"
      className="w-full flex-1 flex flex-col justify-center items-center px-4 py-6 mx-auto select-none"
    >
      <div className="w-full max-w-md mx-auto rounded-2xl overflow-hidden bg-[#0a0908] border border-[#c29b78]/25 shadow-2xl flex flex-col relative">
        {/* Top Header Bar */}
        <div className="w-full flex items-center justify-between px-5 py-3.5 bg-white/[0.02] border-b border-white/[0.06]">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#c29b78] animate-pulse" />
            <span className="text-[11px] tracking-wider text-[#c29b78] font-bold uppercase">
              DOOMCHESS REEL BREAK
            </span>
          </div>
          <span className="text-[10px] tracking-widest text-zinc-500 uppercase font-mono font-bold">
            SPONSORED
          </span>
        </div>

        {/* Ad Body (AdSense or Fallback House Ad) */}
        <div className="p-6 flex flex-col items-center text-center">
          {hasLiveAdSense ? (
            <div className="w-full my-2 min-h-[250px] flex items-center justify-center">
              <ins
                className="adsbygoogle"
                style={{ display: "block", width: "100%", height: "250px" }}
                data-ad-client={clientId}
                data-ad-slot={reelSlotId}
                data-ad-format="auto"
                data-full-width-responsive="true"
              />
            </div>
          ) : (
            <div className="my-2 space-y-4 max-w-sm">
              <div className="w-14 h-14 rounded-2xl bg-[#c29b78]/10 border border-[#c29b78]/25 flex items-center justify-center mx-auto text-[#c29b78] shadow-lg shadow-[#c29b78]/5">
                <Sparkles className="w-7 h-7 stroke-[1.8]" />
              </div>

              <div className="space-y-1.5">
                <h3 className="text-base font-bold text-[#f5f2eb] tracking-tight">
                  DoomChess Pro Experience
                </h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Tired of battery limits? Unlock Unlimited Charge, Zero Ads &amp; Opening Repertoire Drills.
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

          {/* Continue / Next Reel Button */}
          <div className="w-full pt-4 mt-2 border-t border-white/[0.06]">
            <button
              type="button"
              onClick={onContinue}
              data-testid="ad-continue-next-reel-btn"
              className="w-full py-2.5 px-4 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-[#f5f2eb] font-semibold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer active:scale-98"
            >
              <span>Continue / Next Reel</span>
              <ChevronDown className="w-4 h-4 text-[#c29b78] stroke-[2.2]" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
