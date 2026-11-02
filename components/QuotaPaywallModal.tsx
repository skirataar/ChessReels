"use client";

import React, { useState, useEffect } from "react";
import { Crown, Clock, Check, X, Sparkles } from "lucide-react";

interface QuotaPaywallModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpgradeToPro: (planType?: "monthly" | "annual") => void;
  resetsInMs: number;
  limit?: number;
  windowHours?: number;
  adFrequency?: number;
  proPrice?: number;
  annualDiscountPercent?: number;
  reason?: "quota" | "practice";
}

export function QuotaPaywallModal({
  isOpen,
  onClose,
  onUpgradeToPro,
  resetsInMs,
  limit = 4,
  windowHours = 4,
  adFrequency = 2,
  proPrice = 200,
  annualDiscountPercent = 5,
  reason = "quota",
}: QuotaPaywallModalProps) {
  const [msLeft, setMsLeft] = useState<number>(resetsInMs);
  const [selectedPlan, setSelectedPlan] = useState<"monthly" | "annual">("annual");

  useEffect(() => {
    setMsLeft(resetsInMs);
  }, [resetsInMs, isOpen]);

  useEffect(() => {
    if (!isOpen || msLeft <= 0) return;

    const interval = setInterval(() => {
      setMsLeft((prev) => Math.max(0, prev - 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen, msLeft]);

  if (!isOpen) return null;

  // Format countdown hh:mm:ss
  const hours = Math.floor(msLeft / (3600 * 1000));
  const minutes = Math.floor((msLeft % (3600 * 1000)) / (60 * 1000));
  const seconds = Math.floor((msLeft % (60 * 1000)) / 1000);

  const formattedTime = `${hours.toString().padStart(2, "0")}:${minutes
    .toString()
    .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;

  // Pricing math: proPrice is in INR (default 200)
  const monthlyPrice = Math.round(proPrice);
  const rawAnnualPrice = monthlyPrice * 12;
  const annualDiscountFactor = 1 - Math.max(0, annualDiscountPercent) / 100;
  const annualPrice = Math.round(rawAnnualPrice * annualDiscountFactor);
  const annualEquivalentMonthly = Math.round(annualPrice / 12);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Free Quota Reached"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div className="w-full max-w-sm flex flex-col rounded-3xl bg-[#161413] border border-amber-500/40 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 text-white relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          aria-label="Close paywall modal"
          className="absolute top-3.5 right-3.5 p-1 rounded-full bg-white/10 hover:bg-white/20 text-zinc-400 hover:text-white transition-all cursor-pointer z-10"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Hero Banner Header */}
        <div className="p-6 pb-3 flex flex-col items-center text-center space-y-3 bg-gradient-to-b from-amber-500/15 to-transparent">
          {reason === "practice" ? (
            <>
              <div className="relative">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-[#c29b78] flex items-center justify-center text-zinc-950 shadow-xl shadow-amber-500/25">
                  <Crown className="w-7 h-7" />
                </div>
                <span className="absolute -bottom-1 -right-1 px-1.5 py-0.5 rounded-full bg-amber-500 text-[10px] font-black text-zinc-950">
                  PRO
                </span>
              </div>

              <div className="space-y-1">
                <h2 className="text-xl font-black tracking-tight text-white">
                  Unlock Practice Mode
                </h2>
                <p className="text-xs text-zinc-400 max-w-xs leading-relaxed">
                  Practice mode with <strong className="text-zinc-200">custom tactical theme filters</strong> and unranked drills is reserved for Pro members.
                </p>
              </div>

              <div className="w-full p-2.5 rounded-2xl bg-zinc-950/80 border border-amber-500/30 flex items-center justify-between text-xs text-amber-300 font-bold px-3">
                <span>🎯 Target Specific Themes</span>
                <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-[10px]">Mates • Pins • Forks</span>
              </div>
            </>
          ) : (
            <>
              <div className="relative">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-[#c29b78] flex items-center justify-center text-zinc-950 shadow-xl shadow-amber-500/25">
                  <Clock className="w-7 h-7" />
                </div>
                <span className="absolute -bottom-1 -right-1 px-1.5 py-0.5 rounded-full bg-rose-500 text-[10px] font-black text-white">
                  0 / {limit}
                </span>
              </div>

              <div className="space-y-1">
                <h2 className="text-xl font-black tracking-tight text-white">
                  Free Quota Reached
                </h2>
                <p className="text-xs text-zinc-400 max-w-xs leading-relaxed">
                  Free members can solve up to <strong className="text-zinc-200">{limit} puzzles every {windowHours} hours</strong>.
                </p>
              </div>

              {/* Countdown Card */}
              <div className="w-full p-3 rounded-2xl bg-zinc-950/80 border border-zinc-800 flex items-center justify-between">
                <div className="flex items-center gap-2 text-left">
                  <Clock className="w-4 h-4 text-amber-400 shrink-0" />
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                      Next Free Refill In
                    </div>
                    <div className="text-sm font-black font-mono text-amber-300">
                      {msLeft > 0 ? formattedTime : "Ready to play!"}
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300">
                    {windowHours}h Window
                  </span>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Feature Comparison */}
        <div className="px-6 py-2 space-y-2">
          <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
            Why Chess Enthusiasts Go Pro
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-xs text-zinc-300">
              <div className="w-4 h-4 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                <Check className="w-2.5 h-2.5" />
              </div>
              <span><strong>Full Practice Mode</strong> — unranked drills & custom theme filters</span>
            </div>

            <div className="flex items-center gap-2 text-xs text-zinc-300">
              <div className="w-4 h-4 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                <Check className="w-2.5 h-2.5" />
              </div>
              <span><strong>Unlimited puzzles</strong> — zero hourly limits</span>
            </div>

            <div className="flex items-center gap-2 text-xs text-zinc-300">
              <div className="w-4 h-4 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                <Check className="w-2.5 h-2.5" />
              </div>
              <span><strong>100% Ad-Free experience</strong> — zero interruptions</span>
            </div>

            <div className="flex items-center gap-2 text-xs text-zinc-300">
              <div className="w-4 h-4 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                <Check className="w-2.5 h-2.5" />
              </div>
              <span><strong>6.15M+ puzzles</strong> across all Elo ratings</span>
            </div>
          </div>
        </div>

        {/* Plan Selector: Monthly vs Annual */}
        <div className="px-6 pt-2 pb-1">
          <div className="grid grid-cols-2 gap-2">
            {/* Annual Card */}
            <button
              type="button"
              onClick={() => setSelectedPlan("annual")}
              className={`p-2.5 rounded-2xl border text-left transition-all cursor-pointer relative ${
                selectedPlan === "annual"
                  ? "bg-amber-500/15 border-amber-500/60 ring-1 ring-amber-500/40"
                  : "bg-zinc-950/60 border-zinc-800 hover:border-zinc-700"
              }`}
            >
              <span className="absolute -top-2 right-2 px-1.5 py-0.2 rounded-full bg-emerald-500 text-[9px] font-black text-zinc-950 uppercase tracking-wider">
                Save {annualDiscountPercent}%
              </span>
              <div className="text-[11px] font-bold text-white">Annual</div>
              <div className="text-sm font-black text-amber-300 font-mono mt-0.5">
                ₹{annualEquivalentMonthly}
                <span className="text-[10px] font-normal text-zinc-400">/mo</span>
              </div>
              <div className="text-[10px] text-zinc-400">₹{annualPrice}/yr billed</div>
            </button>

            {/* Monthly Card */}
            <button
              type="button"
              onClick={() => setSelectedPlan("monthly")}
              className={`p-2.5 rounded-2xl border text-left transition-all cursor-pointer relative ${
                selectedPlan === "monthly"
                  ? "bg-amber-500/15 border-amber-500/60 ring-1 ring-amber-500/40"
                  : "bg-zinc-950/60 border-zinc-800 hover:border-zinc-700"
              }`}
            >
              <div className="text-[11px] font-bold text-white">Monthly</div>
              <div className="text-sm font-black text-zinc-200 font-mono mt-0.5">
                ₹{monthlyPrice}
                <span className="text-[10px] font-normal text-zinc-400">/mo</span>
              </div>
              <div className="text-[10px] text-zinc-400">Billed monthly</div>
            </button>
          </div>
        </div>

        {/* Actions & Upgrade CTA */}
        <div className="p-6 pt-3 space-y-2">
          <button
            data-testid="paywall-upgrade-pro-btn"
            onClick={() => {
              onUpgradeToPro(selectedPlan);
              onClose();
            }}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-400 to-[#c29b78] hover:from-amber-300 hover:to-[#dfba94] text-zinc-950 font-black text-sm transition-all shadow-lg shadow-amber-500/25 flex items-center justify-center gap-2 cursor-pointer active:scale-98"
          >
            <Crown className="w-4 h-4 text-zinc-950" />
            <span>
              {selectedPlan === "annual"
                ? `Unlock Unlimited Pro (₹${annualPrice}/yr • Save ${annualDiscountPercent}%)`
                : `Unlock Unlimited Pro (₹${monthlyPrice}/mo)`}
            </span>
          </button>

          <button
            onClick={onClose}
            className="w-full py-2 rounded-xl bg-zinc-900/60 hover:bg-zinc-800 text-zinc-400 hover:text-white font-semibold text-xs transition-colors cursor-pointer"
          >
            {reason === "practice" ? "Maybe Later" : "Wait for Refill"}
          </button>
        </div>
      </div>
    </div>
  );
}
