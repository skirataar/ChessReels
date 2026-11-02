"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Sparkles, Zap } from "lucide-react";

export function AnimatedChessHero() {
  const [hasMounted, setHasMounted] = useState(false);
  const [tacticCycle, setTacticCycle] = useState(0);

  useEffect(() => {
    setHasMounted(true);
    const interval = setInterval(() => {
      setTacticCycle((prev) => (prev + 1) % 2);
    }, 3800);
    return () => clearInterval(interval);
  }, []);

  if (!hasMounted) {
    return (
      <div className="w-full max-w-[340px] h-[240px] mx-auto flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-2 border-[#c29b78]/40 border-t-[#c29b78] animate-spin" />
      </div>
    );
  }

  // 4x4 mini tactical board representation
  const squares = Array.from({ length: 16 });

  return (
    <div className="relative w-full max-w-[340px] sm:max-w-[380px] h-[240px] sm:h-[260px] mx-auto flex items-center justify-center select-none overflow-visible">
      {/* Background radial glow */}
      <div className="absolute inset-0 bg-radial from-[#c29b78]/25 via-[#c29b78]/5 to-transparent blur-3xl pointer-events-none transform -translate-y-2" />

      {/* Floating ambient particles */}
      <motion.div
        animate={{ y: [-6, 6, -6], opacity: [0.3, 0.7, 0.3] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-4 left-6 w-2 h-2 rounded-full bg-[#c29b78] blur-[1px]"
      />
      <motion.div
        animate={{ y: [6, -8, 6], opacity: [0.2, 0.6, 0.2] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        className="absolute top-10 right-8 w-1.5 h-1.5 rounded-full bg-[#e8be99] blur-[1px]"
      />
      <motion.div
        animate={{ y: [-4, 8, -4], opacity: [0.4, 0.8, 0.4] }}
        transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
        className="absolute bottom-6 left-10 w-1 h-1 rounded-full bg-[#c29b78]"
      />

      {/* 3D Chessboard Stage */}
      <motion.div
        animate={{
          y: [-5, 5, -5],
          rotateX: [44, 46, 44],
          rotateZ: [-22, -20, -22],
        }}
        transition={{
          duration: 6,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        style={{
          transformStyle: "preserve-3d",
          perspective: 1000,
        }}
        className="relative w-[210px] h-[210px] rounded-2xl bg-gradient-to-b from-[#2d2925] to-[#1c1a18] p-2.5 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.9),0_0_40px_rgba(194,155,120,0.15)] border border-[#c29b78]/30"
      >
        {/* Board Outer Rim Bevel */}
        <div className="w-full h-full rounded-xl bg-[#191816] p-1.5 border border-white/5 relative">
          {/* 4x4 Tactical Grid */}
          <div className="w-full h-full grid grid-cols-4 grid-rows-4 rounded-lg overflow-hidden border border-white/10 shadow-inner">
            {squares.map((_, idx) => {
              const row = Math.floor(idx / 4);
              const col = idx % 4;
              const isDark = (row + col) % 2 === 1;

              // Key tactical squares
              const isSourceSquare = idx === 12; // Bottom left
              const isTargetSquare = idx === 5; // Target jump
              const isQueenSquare = idx === 1; // Target piece

              return (
                <div
                  key={idx}
                  className={`relative flex items-center justify-center transition-colors duration-500 ${
                    isDark ? "bg-[#25221e]" : "bg-[#3d3731]"
                  } ${
                    tacticCycle === 1 && isTargetSquare
                      ? "ring-2 ring-inset ring-[#c29b78] bg-[#4a3f33]"
                      : ""
                  }`}
                >
                  {/* Subtle target highlight on jump */}
                  {isTargetSquare && (
                    <motion.div
                      animate={{
                        opacity: tacticCycle === 1 ? [0, 0.8, 0] : 0,
                        scale: tacticCycle === 1 ? [0.6, 1.4, 1.8] : 0.6,
                      }}
                      transition={{ duration: 1.2, ease: "easeOut" }}
                      className="absolute inset-0 rounded-full bg-[#c29b78]/30 pointer-events-none"
                    />
                  )}

                  {/* Golden Queen standing on top row */}
                  {isQueenSquare && (
                    <div
                      style={{ transform: "rotateZ(20deg) rotateX(-45deg)" }}
                      className="relative z-10 filter drop-shadow-[0_8px_10px_rgba(0,0,0,0.8)]"
                    >
                      <svg
                        className="w-8 h-8 text-[#f5ecd8]"
                        viewBox="0 0 45 45"
                        fill="currentColor"
                      >
                        <path
                          d="M9 26c8.5-1.5 21-1.5 27 0l2-12-7 11V11l-5.5 13.5-3.5-16-3.5 16-5.5-13.5V25l-7-11 2 12z"
                          fill="url(#queenGold)"
                        />
                        <path
                          d="M9 26c0 2 1.5 2 2.5 4 1 1.5 1 1 .5 3.5-1.5 1-1.5 2.5-1.5 2.5-1.5 1.5.5 2.5.5 2.5 6.5 1 16.5 1 23 0 0 0 2-1 .5-2.5 0 0 0-1.5-1.5-2.5-.5-2.5-.5-2 .5-3.5 1-2 2.5-2 2.5-4-8.5-1.5-18.5-1.5-27 0z"
                          fill="url(#queenGold)"
                        />
                        <defs>
                          <linearGradient id="queenGold" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#fff3d6" />
                            <stop offset="50%" stopColor="#e5ba82" />
                            <stop offset="100%" stopColor="#a57948" />
                          </linearGradient>
                        </defs>
                      </svg>
                      {/* Queen crown sparkle */}
                      <motion.div
                        animate={{ scale: [0.8, 1.2, 0.8], opacity: [0.4, 1, 0.4] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="absolute -top-1 left-3 text-[#fff3d6]"
                      >
                        <Sparkles className="w-3 h-3 text-[#c29b78]" />
                      </motion.div>
                    </div>
                  )}

                  {/* Golden Knight making animated tactical leap */}
                  {isSourceSquare && (
                    <motion.div
                      animate={
                        tacticCycle === 0
                          ? {
                              x: 0,
                              y: 0,
                              scale: 1,
                            }
                          : {
                              // Leap up-right towards target square
                              x: 48,
                              y: -92,
                              scale: [1, 1.25, 1],
                            }
                      }
                      transition={{
                        duration: 1.1,
                        ease: [0.25, 1, 0.5, 1],
                      }}
                      style={{
                        transform: "rotateZ(20deg) rotateX(-45deg)",
                        transformStyle: "preserve-3d",
                      }}
                      className="absolute z-20 pointer-events-none filter drop-shadow-[0_12px_14px_rgba(0,0,0,0.85)]"
                    >
                      <svg
                        className="w-9 h-9"
                        viewBox="0 0 45 45"
                        fill="currentColor"
                      >
                        <path
                          d="M22 10c10.5 1 16.5 8 16 29H15c0-9 10-6.5 8-21"
                          fill="url(#knightGold)"
                          stroke="#1a1816"
                          strokeWidth="1.2"
                        />
                        <path
                          d="M24 18c.33 1.17 1 2 2 2.5M28 26c0 .5-.5 1-1 1M18 14c-1.5 2-2 5-1 8 1 3 3 5 5 6"
                          stroke="#ffffff"
                          strokeWidth="1.2"
                          strokeLinecap="round"
                        />
                        <circle cx="28" cy="15" r="1.5" fill="#151413" />
                        <defs>
                          <linearGradient id="knightGold" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#ffeed0" />
                            <stop offset="45%" stopColor="#d4a373" />
                            <stop offset="100%" stopColor="#8d6232" />
                          </linearGradient>
                        </defs>
                      </svg>

                      {/* Knight shadow beneath */}
                      <motion.div
                        animate={{
                          scale: tacticCycle === 1 ? [1, 0.6, 1] : 1,
                          opacity: tacticCycle === 1 ? [0.6, 0.2, 0.6] : 0.6,
                        }}
                        transition={{ duration: 1.1 }}
                        className="w-6 h-2 bg-black/60 rounded-full blur-[2px] mx-auto mt-0.5"
                      />
                    </motion.div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Floating Checkmate / Tactic Badge that appears on landing */}
          <motion.div
            animate={{
              opacity: tacticCycle === 1 ? [0, 1, 1, 0] : 0,
              y: tacticCycle === 1 ? [-10, -22, -22, -28] : -10,
              scale: tacticCycle === 1 ? [0.7, 1.05, 1, 0.9] : 0.7,
            }}
            transition={{
              duration: 2.2,
              times: [0, 0.2, 0.8, 1],
            }}
            style={{ transform: "rotateZ(20deg) rotateX(-45deg)" }}
            className="absolute top-8 left-16 z-30 pointer-events-none"
          >
            <div className="px-2.5 py-1 rounded-full bg-gradient-to-r from-[#c29b78] to-[#dfb489] text-[#151413] text-[10px] font-black uppercase tracking-wider shadow-lg shadow-[#c29b78]/40 flex items-center gap-1 border border-white/30 whitespace-nowrap">
              <Zap className="w-3 h-3 fill-[#151413]" />
              <span>Tactical Strike</span>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
