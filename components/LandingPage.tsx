"use client";

import React from "react";
import { LogIn, UserPlus } from "lucide-react";
import { AnimatedChessHero } from "./AnimatedChessHero";

interface LandingPageProps {
  onContinueWithGoogle: () => void;
  onOpenRegister?: (prefill?: string) => void;
  onOpenLogin: () => void;
  onPreviewAsGuest?: () => void;
  onClose?: () => void;
}

export function LandingPage({
  onContinueWithGoogle,
  onOpenRegister,
  onOpenLogin,
}: LandingPageProps) {
  return (
    <div className="min-h-screen bg-[#151413] font-sans text-[#f5f5f5] selection:bg-[#c29b78] selection:text-[#151413] flex flex-col justify-center items-center px-4 py-8 relative overflow-hidden">
      {/* Ambient background glow accents */}
      <div className="absolute top-1/4 -left-20 w-72 h-72 rounded-full bg-[#c29b78]/10 blur-[90px] pointer-events-none" />
      <div className="absolute bottom-1/4 -right-20 w-72 h-72 rounded-full bg-[#c29b78]/10 blur-[90px] pointer-events-none" />

      <main className="w-full max-w-sm mx-auto flex flex-col items-center justify-center relative z-10 animate-in fade-in zoom-in-95 duration-500">
        {/* Animated Hero Component */}
        <div className="w-full mb-2">
          <AnimatedChessHero />
        </div>

        {/* Brand Name directly on top of the buttons */}
        <div className="text-center mb-6">
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-[#f5f5f5]">
            Chess<span className="text-[#c29b78]">Reel</span>
          </h1>
          <p className="text-xs sm:text-sm text-[#a3a3a3] mt-1.5 font-medium">
            Master tactics in 30-second bites
          </p>
        </div>

        {/* The Two Primary Action Buttons */}
        <div className="w-full space-y-3">
          {/* 1. Continue with Google */}
          <button
            onClick={onContinueWithGoogle}
            type="button"
            className="w-full h-12 rounded-xl bg-[#22201e] hover:bg-[#2a2724] border border-[#c29b78]/30 hover:border-[#c29b78]/60 text-white font-bold text-sm transition-all duration-200 flex items-center justify-center gap-3 shadow-lg shadow-black/40 active:scale-98 cursor-pointer"
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
            <span>Continue with Google</span>
          </button>

          {/* 2. Log In */}
          <button
            onClick={onOpenLogin}
            type="button"
            className="w-full h-12 rounded-xl bg-[#c29b78] hover:bg-[#d4b08f] text-[#151413] font-black text-sm uppercase tracking-wider transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-[#c29b78]/25 active:scale-98 cursor-pointer"
          >
            <LogIn className="w-4 h-4 stroke-[2.5]" />
            <span>Log In</span>
          </button>
        </div>

        {/* Subtle Sign Up / Create Account switcher */}
        {onOpenRegister && (
          <div className="mt-5 text-center">
            <span className="text-xs text-[#a3a3a3]">
              Don&apos;t have an account?{" "}
            </span>
            <button
              onClick={() => onOpenRegister()}
              className="text-xs font-bold text-[#c29b78] hover:text-[#e8be99] transition-colors cursor-pointer underline underline-offset-4"
            >
              Create Account
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
