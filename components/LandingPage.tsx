"use client";

import React, { useState, useEffect } from "react";
import { ArrowRight, Mail, LogIn } from "lucide-react";

interface LandingPageProps {
  onContinueWithGoogle: () => void;
  onOpenRegister: (prefill?: string) => void;
  onOpenLogin: () => void;
  onPreviewAsGuest: () => void;
}

export function LandingPage({
  onContinueWithGoogle,
  onOpenRegister,
  onOpenLogin,
  onPreviewAsGuest,
}: LandingPageProps) {
  const [emailInput, setEmailInput] = useState<string>("");
  const [isRevealed, setIsRevealed] = useState<boolean>(false);
  const [isLaunchingGuest, setIsLaunchingGuest] = useState<boolean>(false);

  // Staggered reveal animation on load
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsRevealed(true);
    }, 200);
    return () => clearTimeout(timer);
  }, []);

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onOpenRegister(emailInput.trim() || undefined);
  };

  const handleGuestClick = () => {
    setIsLaunchingGuest(true);
    setTimeout(() => {
      onPreviewAsGuest();
    }, 450);
  };

  return (
    <div className="min-h-[100dvh] bg-[#0A0A0A] font-sans text-[#e5e1e4] antialiased flex flex-col selection:bg-[#4edea3] selection:text-[#002113] overflow-x-hidden">
      {/* 1. Header Bar */}
      <header className="fixed top-0 inset-x-0 z-50 pt-safe bg-[#0A0A0A]/80 backdrop-blur-xl border-b border-white/[0.04]">
        <div className="h-16 px-4 max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#18181B] border border-white/10 flex items-center justify-center text-[#4edea3] shadow-sm">
              <span className="material-symbols-outlined text-[20px]">grid_view</span>
            </div>
            <span className="text-[17px] font-bold tracking-tight text-[#e5e1e4]">
              Chess<span className="text-[#4edea3]">Reel</span>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#18181B] border border-white/5">
              <span className="w-2 h-2 rounded-full bg-[#4edea3] animate-pulse" />
              <span className="text-[10px] text-[#bbcabf] uppercase tracking-wider font-bold">
                Tactics Live
              </span>
            </div>

            <button
              onClick={onOpenLogin}
              className="px-2.5 py-1 rounded-lg text-xs font-semibold text-[#bbcabf] hover:text-white transition-colors cursor-pointer flex items-center gap-1"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign In</span>
            </button>
          </div>
        </div>
      </header>

      {/* 2. Main Content Canvas */}
      <main className="flex-1 flex flex-col relative w-full pt-20 pb-safe bg-[#0A0A0A]">
        <div className="flex flex-col w-full px-4 py-2 max-w-md mx-auto relative overflow-hidden select-none">
          {/* Subtle ambient vignette */}
          <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-80 h-48 bg-[#4edea3]/10 rounded-full blur-3xl pointer-events-none -z-10" />

          {/* Hero Header */}
          <div className="flex flex-col items-center text-center pt-1 pb-3 animate-in fade-in slide-in-from-top-4 duration-500">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#201f21] border border-white/5 mb-2.5 shadow-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-[#4edea3] animate-pulse" />
              <span className="text-[11px] text-[#bbcabf] uppercase tracking-wider font-semibold">
                Daily Tactics Reel
              </span>
            </div>

            <h1 className="text-[28px] sm:text-[32px] font-extrabold text-[#e5e1e4] tracking-tight leading-tight">
              Master Tactics in <span className="text-[#4edea3]">30s Reels</span>
            </h1>

            <p className="text-[13px] text-[#bbcabf] max-w-[320px] mt-1.5 leading-relaxed">
              Infinite Elo-adaptive puzzles from master games. Solve, level up, and lock your rating to your account.
            </p>
          </div>

          {/* Elevated Authentic Chessboard Teaser Card */}
          <div className="w-full rounded-2xl bg-[#201f21] border border-white/5 p-3.5 mb-3 shadow-xl animate-in fade-in zoom-in-95 duration-500">
            {/* Header info strip */}
            <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-white/5 text-[11px]">
              <div className="flex items-center gap-2">
                <span className="px-1.5 py-0.5 rounded bg-[#2a2a2c] text-[#bbcabf] font-mono font-medium text-[10px]">
                  #1,842
                </span>
                <span className="font-semibold text-[#e5e1e4]">White to Move</span>
                <span className="text-[#bbcabf]">•</span>
                <span className="text-[#4edea3] font-bold">Mate in 2</span>
              </div>
              <div className="flex items-center gap-1 text-[#bbcabf] font-mono text-[11px]">
                <span className="material-symbols-outlined text-[13px] text-[#bbcabf]">schedule</span>
                <span>0:30</span>
              </div>
            </div>

            {/* Authentic 4x4 Tactical Board Focus */}
            <div className="flex items-center gap-3">
              <div className="w-32 h-32 rounded-xl bg-[#0e0e10] border border-white/10 p-1 shrink-0 shadow-inner">
                <div className="grid grid-cols-4 grid-rows-4 w-full h-full rounded overflow-hidden">
                  {/* Row 1 */}
                  <div className="bg-[#3D3B38] flex items-center justify-center">
                    <svg className="w-5 h-5 fill-[#e5e1e4]" viewBox="0 0 24 24">
                      <path d="M19 22H5v-2h14v2M17.5 19H6.5v-2.5l1.5-1.5V11l-2-2V7h12v2l-2 2v4l1.5 1.5V19M8 4h2v2H8V4m3 0h2v2h-2V4m3 0h2v2h-2V4M6 2h12v3H6V2z" />
                    </svg>
                  </div>
                  <div className="bg-[#262421]" />
                  <div className="bg-[#3D3B38]" />
                  <div className="bg-[#262421] flex items-center justify-center">
                    <svg className="w-4 h-4 fill-[#bbcabf]" viewBox="0 0 24 24">
                      <path d="M19 22H5v-2h14v2m-3.5-3.5H8.5V15c0-1.65 1.35-3 3-3h1c1.65 0 3 1.35 3 3v3.5M12 2a4 4 0 0 1 4 4c0 1.95-1.4 3.58-3.25 3.93l.25 1.07h-2l.25-1.07A3.991 3.991 0 0 1 8 6a4 4 0 0 1 4-4z" />
                    </svg>
                  </div>

                  {/* Row 2 */}
                  <div className="bg-[#262421]" />
                  <div className="bg-[#3D3B38]" />
                  <div className="bg-[#262421] flex items-center justify-center">
                    <svg className="w-4 h-4 fill-[#bbcabf]" viewBox="0 0 24 24">
                      <path d="M19 22H5v-2h14v2M16 11c0 2.21-1.79 4-4 4s-4-1.79-4-4V8h8v3m1-7h-3V2h-4v2H7c-.55 0-1 .45-1 1v2h12V5c0-.55-.45-1-1-1z" />
                    </svg>
                  </div>
                  <div className="bg-[#3D3B38]" />

                  {/* Row 3 - Target Fork Square */}
                  <div className="bg-[#3D3B38]" />
                  <div className="bg-[#262421] flex items-center justify-center relative bg-[#4edea3]/15">
                    <span className="absolute inset-0 border-2 border-[#4edea3]/60 rounded-sm pointer-events-none" />
                    <svg className="w-5 h-5 fill-[#4edea3]" viewBox="0 0 24 24">
                      <path d="M19 22H5v-2h14v2M17 11.5c0-.83-.67-1.5-1.5-1.5h-1c-.17 0-.33.03-.48.09C13.88 8.66 12.63 7.5 11 7.15V5c0-.55-.45-1-1-1s-1 .45-1 1v1.1c-2.34.46-4 2.5-4 4.9V19h12v-7.5zM11 13c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1z" />
                    </svg>
                  </div>
                  <div className="bg-[#3D3B38]" />
                  <div className="bg-[#262421]" />

                  {/* Row 4 */}
                  <div className="bg-[#262421] flex items-center justify-center">
                    <svg className="w-5 h-5 fill-[#e5e1e4]" viewBox="0 0 24 24">
                      <path d="M19 22H5v-2h14v2M17.5 19H6.5v-2.5l1.5-1.5V11l-2-2V7h12v2l-2 2v4l1.5 1.5V19M8 4h2v2H8V4m3 0h2v2h-2V4m3 0h2v2h-2V4M6 2h12v3H6V2z" />
                    </svg>
                  </div>
                  <div className="bg-[#3D3B38]" />
                  <div className="bg-[#262421]" />
                  <div className="bg-[#3D3B38]" />
                </div>
              </div>

              {/* Tactical Card Info & Subtle Swipe Hint */}
              <div className="flex-1 flex flex-col justify-center min-w-0 pr-1">
                <div className="flex items-center gap-1.5 text-[11px] text-[#ffb95f] font-bold tracking-wider uppercase mb-0.5">
                  <span className="material-symbols-outlined text-[13px]">bolt</span>
                  <span>Tactical Shot</span>
                </div>
                <p className="text-[17px] font-bold text-[#e5e1e4] leading-tight tracking-tight">
                  1. Nf7+ Kg8
                </p>
                <p className="text-[12px] text-[#bbcabf] truncate mt-0.5 font-medium">
                  Rating: 1420 Elo • Royal Fork
                </p>
                <div className="mt-2 pt-1.5 border-t border-white/5 flex items-center gap-1 text-[#4edea3] text-[11px] font-medium">
                  <span className="material-symbols-outlined text-[15px] animate-bounce">
                    keyboard_arrow_up
                  </span>
                  <span>Swipe up to solve</span>
                </div>
              </div>
            </div>
          </div>

          {/* Account-Level Elo Value Banner */}
          <div className="w-full rounded-xl bg-gradient-to-r from-[#18181B] via-[#1c221e] to-[#18181B] border border-[#4edea3]/30 px-3.5 py-2.5 mb-3 flex items-center justify-between gap-2 shadow-sm">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#4edea3] shrink-0" />
              <p className="text-[12px] text-[#bbcabf] leading-snug">
                <strong className="text-white">Account-Level Elo Guarantee:</strong> Log in so your tactical rating and streaks are saved permanently in the cloud.
              </p>
            </div>
            <span className="text-[10px] text-[#4edea3] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-[#4edea3]/10 border border-[#4edea3]/20 shrink-0">
              Synced
            </span>
          </div>

          {/* Staggered Animated Authentication Form Section */}
          <div
            className={`flex flex-col gap-2.5 w-full transition-all duration-700 ease-out ${
              isRevealed
                ? "opacity-100 translate-y-0 scale-100"
                : "opacity-0 translate-y-6 scale-98 pointer-events-none"
            }`}
          >
            {/* Native Google Sign-In Button */}
            <button
              onClick={onContinueWithGoogle}
              type="button"
              className="w-full h-11 rounded-xl bg-[#201f21] hover:bg-[#2a2a2c] border border-white/10 active:scale-[0.99] transition-all flex items-center justify-center gap-2.5 shadow-sm group cursor-pointer"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                <path
                  d="M12 5c1.6 0 3 .6 4.1 1.7l3.1-3.1C17.3 1.8 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.4 9 5 12 5z"
                  fill="#EA4335"
                />
                <path
                  d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.6h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.9z"
                  fill="#4285F4"
                />
                <path
                  d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.8s.2-2.1.4-2.8L1.9 6.3C.7 8.7 0 10.3 0 12s.7 3.3 1.9 5.7l3.7-2.9z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.4-6.4-5.2L1.9 16C3.7 19.7 7.5 23 12 23z"
                  fill="#34A853"
                />
              </svg>
              <span className="font-semibold text-[14px] text-[#e5e1e4] group-hover:text-[#4edea3] transition-colors">
                Continue with Google
              </span>
            </button>

            {/* Refined Subtle Divider */}
            <div className="flex items-center gap-3 my-0.5">
              <div className="flex-1 h-[1px] bg-white/5" />
              <span className="text-[11px] text-[#bbcabf] font-medium uppercase tracking-wider">
                or with email
              </span>
              <div className="flex-1 h-[1px] bg-white/5" />
            </div>

            {/* Clean Email/Username Input & Action Form */}
            <form onSubmit={handleEmailSubmit} className="flex flex-col gap-2">
              <div className="relative w-full">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#bbcabf]">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  id="email-input"
                  type="text"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="grandmaster@chessreel.com"
                  className="w-full h-11 pl-9 pr-3 rounded-xl bg-[#201f21] border border-white/10 text-[#e5e1e4] placeholder:text-[#bbcabf]/50 text-[14px] focus:outline-none focus:border-[#4edea3]/60 transition-colors"
                />
              </div>

              {/* Emerald Primary Action Button */}
              <button
                type="submit"
                className="w-full h-11 rounded-xl bg-[#4edea3] hover:bg-[#10b981] text-[#002113] font-bold text-[14px] active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-[#4edea3]/20 group"
              >
                <span>Get Started Free</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </form>

            {/* Frictionless Guest Mode Link */}
            <div className="text-center mt-1">
              <button
                id="guest-play-btn"
                type="button"
                onClick={handleGuestClick}
                disabled={isLaunchingGuest}
                className="inline-flex items-center gap-1.5 text-[13px] text-[#bbcabf] hover:text-[#4edea3] transition-colors cursor-pointer py-1"
              >
                {isLaunchingGuest ? (
                  <span className="flex items-center gap-1.5 text-[#4edea3] font-semibold">
                    <span className="material-symbols-outlined text-[14px] animate-spin">
                      progress_activity
                    </span>
                    <span>Launching Quick Reel...</span>
                  </span>
                ) : (
                  <>
                    <span>Play guest puzzle without saving</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Understated Native Footer & Trust Assurance */}
          <div className="mt-4 pt-2.5 border-t border-white/5 flex flex-col items-center gap-1.5 text-center">
            <div className="flex items-center justify-center gap-2 text-[11px] text-[#bbcabf] font-medium">
              <span>Stockfish 16</span>
              <span className="text-white/20">•</span>
              <span>Offline PWA</span>
              <span className="text-white/20">•</span>
              <span className="text-[#4edea3] font-bold">100% Free</span>
            </div>
            <p className="text-[11px] text-[#bbcabf]/60 leading-tight">
              By continuing, you agree to our Terms &amp; Privacy.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
