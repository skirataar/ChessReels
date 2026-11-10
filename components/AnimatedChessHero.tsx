"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Flame,
  Zap,
  Sparkles,
  Heart,
  Share2,
  ChevronUp,
  Volume2,
  Trophy,
} from "lucide-react";
import { Chessboard } from "react-chessboard";

// Famous rapid tactic: Queen mate Qxf7#
const INITIAL_FEN = "r1bqkb1r/pppp1ppp/2n5/4p2Q/2B1n3/8/PPPP1PPP/RNB1K1NR w KQkq - 0 1";
const MATING_FEN = "r1bqkb1r/pppp1Qpp/2n5/4p3/2B1n3/8/PPPP1PPP/RNB1K1NR b KQkq - 0 1";

export function AnimatedChessHero() {
  const [hasMounted, setHasMounted] = useState(false);
  const [isMate, setIsMate] = useState(false);
  const [likeCount, setLikeCount] = useState(2480);
  const [isLiked, setIsLiked] = useState(false);

  useEffect(() => {
    setHasMounted(true);
    // Cycle tactic every 3.5 seconds
    const interval = setInterval(() => {
      setIsMate((prev) => !prev);
    }, 3200);

    return () => clearInterval(interval);
  }, []);

  if (!hasMounted) {
    return (
      <div className="w-full max-w-[320px] h-[380px] mx-auto flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-2 border-[#c29b78]/40 border-t-[#c29b78] animate-spin" />
      </div>
    );
  }

  const customSquareStyles: Record<string, React.CSSProperties> = isMate
    ? {
        f7: {
          backgroundColor: "rgba(239, 68, 68, 0.45)",
          boxShadow: "inset 0 0 12px rgba(239, 68, 68, 0.8)",
        },
        h5: {
          backgroundColor: "rgba(194, 155, 120, 0.35)",
        },
      }
    : {
        h5: {
          backgroundColor: "rgba(194, 155, 120, 0.4)",
          boxShadow: "inset 0 0 8px rgba(194, 155, 120, 0.6)",
        },
        c4: {
          backgroundColor: "rgba(194, 155, 120, 0.25)",
        },
      };

  return (
    <div className="relative w-full max-w-[320px] sm:max-w-[340px] mx-auto select-none">
      {/* Golden ambient background lighting */}
      <div className="absolute -inset-4 bg-gradient-to-tr from-amber-500/15 via-[#c29b78]/10 to-transparent blur-3xl pointer-events-none rounded-3xl" />

      {/* Floating Tactical Badges */}
      <motion.div
        animate={{ y: [-3, 3, -3] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        className="absolute -top-3.5 -left-3 z-30 px-2.5 py-1 rounded-full bg-[#1e1c1a]/95 border border-amber-500/40 text-amber-300 text-[11px] font-bold flex items-center gap-1.5 shadow-xl shadow-black/80 backdrop-blur-md"
      >
        <Zap className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
        <span>Tactical Puzzle #402</span>
      </motion.div>

      <motion.div
        animate={{ y: [3, -3, 3] }}
        transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
        className="absolute -top-3.5 -right-3 z-30 px-2.5 py-1 rounded-full bg-[#1e1c1a]/95 border border-[#c29b78]/40 text-[#c29b78] text-[11px] font-bold flex items-center gap-1.5 shadow-xl shadow-black/80 backdrop-blur-md"
      >
        <Flame className="w-3.5 h-3.5 text-orange-400 fill-orange-400" />
        <span>7 Day Streak</span>
      </motion.div>

      {/* Smartphone / Vertical Reel Card */}
      <div className="relative w-full rounded-[28px] bg-[#1a1816]/95 border border-white/10 p-3 pb-3.5 shadow-2xl shadow-black/90 backdrop-blur-xl overflow-hidden">
        {/* Top Reel HUD Header */}
        <div className="w-full flex items-center justify-between gap-2 px-1 mb-2.5">
          <div className="flex items-center gap-1.5 bg-[#252220] px-2.5 py-1 rounded-full border border-white/5">
            <span className="text-amber-400 font-bold text-xs flex items-center gap-1"><Zap className="w-3 h-3 fill-amber-400 text-amber-400" /> 1540</span>
            <span className="text-[10px] text-zinc-400 font-semibold uppercase">Elo</span>
          </div>

          <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
            <Sparkles className="w-3 h-3" />
            <span>Mate in 1</span>
          </div>
        </div>

        {/* Board Container + Right Action Column */}
        <div className="relative flex items-center justify-center gap-2">
          {/* Main 8x8 Chessboard */}
          <div className="relative rounded-2xl overflow-hidden border border-white/10 shadow-lg">
            <div className="w-[220px] h-[220px]">
              <Chessboard
                options={{
                  id: "landing-reel-hero-board",
                  position: isMate ? MATING_FEN : INITIAL_FEN,
                  allowDragging: false,
                  canDragPiece: () => false,
                  showNotation: false,
                  animationDurationInMs: 300,
                  darkSquareStyle: { backgroundColor: "#262421" },
                  lightSquareStyle: { backgroundColor: "#3d3b38" },
                  squareStyles: customSquareStyles,
                  boardStyle: { borderRadius: "14px" },
                }}
              />
            </div>

            {/* Checkmate / Success Banner overlay */}
            <AnimatePresence>
              {isMate && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.85, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.85 }}
                  transition={{ duration: 0.2 }}
                  className="absolute inset-x-2 bottom-2 z-20 py-1 px-2.5 rounded-xl bg-emerald-500/95 text-zinc-950 font-black text-xs flex items-center justify-between shadow-lg backdrop-blur-md"
                >
                  <div className="flex items-center gap-1">
                    <Trophy className="w-3.5 h-3.5 fill-zinc-950" />
                    <span>CHECKMATE!</span>
                  </div>
                  <span className="bg-zinc-950/20 px-1.5 py-0.5 rounded-full text-[10px] font-bold">
                    +16 Elo
                  </span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Reel Social Buttons Rail (Right) */}
          <div className="flex flex-col items-center gap-3 py-1">
            <button
              type="button"
              onClick={() => {
                setIsLiked(!isLiked);
                setLikeCount((c) => (isLiked ? c - 1 : c + 1));
              }}
              className="flex flex-col items-center gap-0.5 group cursor-pointer"
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                  isLiked
                    ? "bg-rose-500/20 text-rose-500 border border-rose-500/40"
                    : "bg-[#252220] text-zinc-300 hover:text-white border border-white/5"
                }`}
              >
                <Heart
                  className={`w-4 h-4 ${
                    isLiked ? "fill-rose-500" : "group-hover:scale-110"
                  } transition-transform`}
                />
              </div>
              <span className="text-[9px] font-bold text-zinc-400">
                {likeCount.toLocaleString()}
              </span>
            </button>

            <div className="flex flex-col items-center gap-0.5">
              <div className="w-8 h-8 rounded-full bg-[#252220] border border-white/5 flex items-center justify-center text-zinc-400">
                <Share2 className="w-3.5 h-3.5" />
              </div>
              <span className="text-[9px] font-bold text-zinc-400">Share</span>
            </div>

            <div className="w-8 h-8 rounded-full bg-[#252220] border border-white/5 flex items-center justify-center text-[#c29b78]">
              <Volume2 className="w-3.5 h-3.5" />
            </div>
          </div>
        </div>

        {/* Reel Bottom Swipe Hint */}
        <div className="mt-2.5 pt-2 border-t border-white/5 flex items-center justify-between text-zinc-400 px-1">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[11px] font-medium text-zinc-300">
              {isMate ? "Tactical solution played" : "White to move and win"}
            </span>
          </div>

          <motion.div
            animate={{ y: [-2, 2, -2] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
            className="flex items-center gap-0.5 text-[10px] font-bold text-[#c29b78]"
          >
            <span>Swipe next</span>
            <ChevronUp className="w-3.5 h-3.5" />
          </motion.div>
        </div>
      </div>
    </div>
  );
}
