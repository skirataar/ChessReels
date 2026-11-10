"use client";

import React, { useEffect, useState } from "react";
import { ChevronDown, ArrowRight, Sparkles, ShieldCheck } from "lucide-react";

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
      style={{
        width: "min(calc(100vw - 24px), calc(100dvh - 230px), 520px)",
        maxWidth: "min(calc(100vw - 24px), calc(100dvh - 230px), 520px)",
      }}
    >
      <div className="w-full bg-[#0a0908] border border-[#c29b78]/25 rounded-2xl p-6 shadow-2xl flex flex-col items-center text-center relative overflow-hidden">
        {/* Top-Right Sponsored Badge */}
        <div className="w-full flex items-center justify-between mb-4 border-b border-white/[0.06] pb-3">
          <div className="flex items-center gap-1.5 text-zinc-500">
            <span className="w-1.5 h-1.5 rounded-full bg-[#c29b78]" />
            <span className="text-[10px] tracking-widest text-zinc-400 font-bold uppercase">
              DoomChess Reel Break
            </span>
          </div>
          <span className="text-[10px] tracking-widest text-zinc-500 uppercase font-mono font-semibold">
            SPONSORED
          </span>
        </div>

        {hasLiveAdSense ? (
          <div className="w-full my-4 min-h-[250px] flex items-center justify-center">
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
          /* Fallback / Sandbox House Ad */
          <div className="my-4 space-y-4 max-w-sm">
            <div className="w-12 h-12 rounded-xl bg-[#c29b78]/10 border border-[#c29b78]/20 flex items-center justify-center mx-auto text-[#c29b78]">
              <Sparkles className="w-6 h-6 stroke-[1.8]" />
            </div>

            <div className="space-y-1.5">
              <h3 className="text-base font-bold text-[#f5f2eb] tracking-tight">
                DoomChess Pro Experience
              </h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Tired of battery limits? Unlock Unlimited Charge, Zero Ads & Opening Repertoire Drills.
              </p>
            </div>

            <button
              onClick={onUpgradeToPro}
              className="w-full py-3 px-4 rounded-xl bg-[#c29b78] hover:bg-[#dfb48c] text-[#0a0908] font-bold text-xs tracking-wider uppercase transition-all shadow-lg shadow-[#c29b78]/15 flex items-center justify-center gap-2 cursor-pointer active:scale-98"
            >
              <span>Upgrade to Pro</span>
              <ArrowRight className="w-4 h-4 stroke-[2.2]" />
            </button>
          </div>
        )}

        {/* Continue / Next Reel Button */}
        <div className="w-full pt-4 mt-2 border-t border-white/[0.06]">
          <button
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
  );
}

