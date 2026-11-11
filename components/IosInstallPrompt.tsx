"use client";

import React, { useState, useEffect } from "react";
import { X } from "lucide-react";

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const STORAGE_KEY = "doomchess_ios_prompt_dismissed";

export function IosInstallPrompt() {
  const [isVisible, setIsVisible] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const isIos =
        /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
      const isStandalone =
        window.matchMedia("(display-mode: standalone)").matches ||
        Boolean((navigator as any).standalone);

      if (!isIos || isStandalone) {
        return;
      }

      const dismissed = localStorage.getItem(STORAGE_KEY);
      if (dismissed) {
        const timestamp = parseInt(dismissed, 10);
        if (!isNaN(timestamp) && Date.now() - timestamp < SEVEN_DAYS_MS) {
          return;
        }
      }

      // Small delay before showing so user lands smoothly
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 1500);

      return () => clearTimeout(timer);
    } catch {
      // Storage access or navigator check failure
    }
  }, []);

  const handleDismiss = () => {
    setIsVisible(false);
    try {
      localStorage.setItem(STORAGE_KEY, Date.now().toString());
    } catch {}
  };

  if (!isVisible) return null;

  return (
    <aside
      aria-label="Install App"
      className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-[400px] bg-[#0a0908]/95 backdrop-blur-xl border border-[#c29b78]/30 rounded-2xl p-4 shadow-2xl flex flex-col gap-2.5 text-left animate-in slide-in-from-bottom-4 duration-300 pointer-events-auto"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* Tactical Chess Knight Vector */}
          <div className="w-6 h-6 rounded-lg bg-[#c29b78]/15 border border-[#c29b78]/30 flex items-center justify-center text-[#c29b78]">
            <svg
              viewBox="0 0 24 24"
              className="w-3.5 h-3.5 fill-current"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <path d="M19 22H5v-2h14v2zm-2-4H7v-2h10v2zm-5-14c1.1 0 2 .9 2 2v1h2c1.1 0 2 .9 2 2v2c0 2.2-1.8 4-4 4h-1v1H9v-2.1c-1.2-.5-2.2-1.4-2.7-2.6-.6-1.4-.4-3 .5-4.3l.5-.7c.3-.4.8-.7 1.3-.9L12 4z" />
            </svg>
          </div>
          <span className="text-xs font-bold text-zinc-100 uppercase tracking-wider">
            Install DoomChess
          </span>
        </div>

        <button
          onClick={handleDismiss}
          aria-label="Dismiss install prompt"
          className="w-6 h-6 rounded-full flex items-center justify-center text-zinc-400 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] transition-colors cursor-pointer"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Step Guidance */}
      <div className="space-y-1.5 text-xs text-zinc-300">
        <div className="flex items-center gap-2">
          <span className="text-zinc-400 font-mono text-[11px]">1.</span>
          <span>Tap the Share button in Safari</span>
          {/* iOS Share upward-arrow-from-box Vector */}
          <div className="inline-flex p-1 rounded bg-white/[0.06] border border-white/10 text-[#c29b78]">
            <svg
              viewBox="0 0 24 24"
              className="w-3.5 h-3.5 stroke-current fill-none stroke-2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
              <polyline points="16 6 12 2 8 6" />
              <line x1="12" y1="2" x2="12" y2="15" />
            </svg>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-zinc-400 font-mono text-[11px]">2.</span>
          <span>Select &apos;Add to Home Screen&apos;</span>
          {/* Plus-in-Square Vector */}
          <div className="inline-flex p-1 rounded bg-white/[0.06] border border-white/10 text-[#c29b78]">
            <svg
              viewBox="0 0 24 24"
              className="w-3.5 h-3.5 stroke-current fill-none stroke-2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <line x1="12" y1="8" x2="12" y2="16" />
              <line x1="8" y1="12" x2="16" y2="12" />
            </svg>
          </div>
        </div>
      </div>

      {/* Micro copy */}
      <p className="text-[10px] text-zinc-500 font-medium">
        Full-screen board layout and faster puzzle loading.
      </p>
    </aside>
  );
}

