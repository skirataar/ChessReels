"use client";

import React from "react";
import Link from "next/link";
import {
  X,
  ShieldCheck,
  Cpu,
  BatteryCharging,
  FileText,
  Mail,
  Sparkles,
  ExternalLink,
  ChevronRight,
} from "lucide-react";
import { SUPPORT_EMAIL, SUPPORT_MAILTO } from "@/lib/support";

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenUpgrade?: () => void;
  isPro?: boolean;
}

export function AboutModal({
  isOpen,
  onClose,
  onOpenUpgrade,
  isPro = false,
}: AboutModalProps) {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="About DoomChess"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-md max-h-[85vh] flex flex-col bg-[#0a0908] border border-[#c29b78]/30 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.8)] overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-white/[0.08] flex items-center justify-between shrink-0 bg-[#0f0e0d]">
          <div className="flex items-center gap-2.5">
            <img
              src="/icons/icon.svg"
              alt=""
              aria-hidden="true"
              className="w-7 h-7 rounded-md object-contain"
            />
            <div>
              <div className="text-sm font-black text-[#f5f5f5] tracking-tight flex items-center gap-1.5">
                <span>DoomChess</span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#c29b78]/15 border border-[#c29b78]/30 text-[#c29b78]">
                  v1.2.0
                </span>
              </div>
              <p className="text-[11px] text-[#a3a3a3]">
                Tactical Chess Reels &amp; Elo Mastery
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center text-[#a3a3a3] hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4 overflow-y-auto text-xs text-zinc-300 leading-relaxed scrollbar-thin">
          {/* Brand Philosophy */}
          <div className="p-3.5 rounded-xl bg-[#141210] border border-white/[0.06] space-y-2">
            <div className="flex items-center gap-2 text-[#c29b78] font-bold">
              <Sparkles className="w-4 h-4 shrink-0" />
              <span>Obsidian Tactical Theater</span>
            </div>
            <p className="text-[#a3a3a3] text-[11px] leading-relaxed">
              DoomChess strips away clunky menus to deliver an ultra-responsive, vertical reel of tactical puzzles designed to build instinctive calculation, pattern recognition, and blitz speed.
            </p>
          </div>

          {/* Engine & Puzzles */}
          <div className="p-3.5 rounded-xl bg-[#141210] border border-white/[0.06] space-y-2">
            <div className="flex items-center gap-2 text-[#c29b78] font-bold">
              <Cpu className="w-4 h-4 shrink-0" />
              <span>6,000,000+ Master Puzzles &amp; Stockfish</span>
            </div>
            <p className="text-[#a3a3a3] text-[11px] leading-relaxed">
              Every position is curated from grandmaster tournament archives and verified with Stockfish deep-engine analysis. Puzzles adapt to your performance using dynamic Glicko-Elo balancing.
            </p>
          </div>

          {/* Continuous Battery Recharge */}
          <div className="p-3.5 rounded-xl bg-[#141210] border border-white/[0.06] space-y-2">
            <div className="flex items-center gap-2 text-[#c29b78] font-bold">
              <BatteryCharging className="w-4 h-4 shrink-0" />
              <span>Dynamic Continuous Battery Cell</span>
            </div>
            <p className="text-[#a3a3a3] text-[11px] leading-relaxed">
              Energy recharges progressively like a modern battery cell: 1 charge every 16 minutes (~4 puzzles per hour), reaching full 15-charge capacity in 4 hours. No all-or-nothing lockouts.
            </p>
          </div>

          {/* Pro Benefits or Status */}
          <div className="p-3.5 rounded-xl bg-gradient-to-r from-[#201c18] to-[#141210] border border-[#c29b78]/30 flex items-center justify-between gap-3">
            <div>
              <div className="font-bold text-white text-xs flex items-center gap-1.5">
                <span>{isPro ? "Pro Membership Active" : "DoomChess Pro"}</span>
                {isPro && (
                  <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-[#c29b78]/20 text-[#c29b78] border border-[#c29b78]/40">
                    ACTIVE
                  </span>
                )}
              </div>
              <p className="text-[11px] text-[#a3a3a3] mt-0.5">
                {isPro
                  ? "Unlimited charge, 0 ads, Stockfish lines, & practice mode."
                  : "Infinite tactical charge, zero ads, Stockfish analysis."}
              </p>
            </div>
            {onOpenUpgrade && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenUpgrade();
                }}
                className="px-3 py-1.5 rounded-lg bg-[#c29b78] hover:bg-[#d4b08f] text-[#0a0908] font-bold text-xs shrink-0 transition-all cursor-pointer shadow-sm active:scale-95"
              >
                {isPro ? "Manage" : "Upgrade"}
              </button>
            )}
          </div>

          {/* Contact Support */}
          <div className="p-3.5 rounded-xl bg-[#141210] border border-white/[0.06] flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Mail className="w-4 h-4 text-[#c29b78] shrink-0" />
              <div>
                <div className="font-semibold text-white text-xs">Support &amp; Feedback</div>
                <div className="text-[11px] text-[#a3a3a3]">{SUPPORT_EMAIL}</div>
              </div>
            </div>
            <a
              href={SUPPORT_MAILTO}
              className="px-2.5 py-1 rounded-md bg-white/[0.05] hover:bg-white/[0.1] text-zinc-200 text-xs font-medium border border-white/10 flex items-center gap-1 transition-colors"
            >
              <span>Email</span>
              <ExternalLink className="w-3 h-3 text-zinc-400" />
            </a>
          </div>

          {/* Legal Links */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <Link
              href="/terms"
              onClick={onClose}
              className="p-2.5 rounded-xl bg-[#141210] hover:bg-[#1a1715] border border-white/[0.06] text-center text-zinc-300 text-[11px] font-medium flex items-center justify-center gap-1.5 transition-colors"
            >
              <FileText className="w-3.5 h-3.5 text-zinc-400" />
              <span>Terms of Service</span>
            </Link>
            <Link
              href="/privacy"
              onClick={onClose}
              className="p-2.5 rounded-xl bg-[#141210] hover:bg-[#1a1715] border border-white/[0.06] text-center text-zinc-300 text-[11px] font-medium flex items-center justify-center gap-1.5 transition-colors"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-zinc-400" />
              <span>Privacy Policy</span>
            </Link>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-white/[0.08] bg-[#0f0e0d] flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-[#c29b78] hover:bg-[#d4b08f] text-[#0a0908] font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

