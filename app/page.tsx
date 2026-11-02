"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ArrowRight, Check } from "lucide-react";

// --- Types ---
type FlowStep = "gate" | "step-elo" | "step-goal" | "step-board" | "auth";

interface EloOption {
  id: string;
  title: string;
  description: string;
  baseline: number;
  skillLevel: "beginner" | "intermediate" | "advanced";
}

interface GoalOption {
  value: number;
  label: string;
  badge: string;
}

interface BoardTheme {
  id: string;
  name: string;
  light: string;
  dark: string;
}

// --- Data Constants ---
const ELO_OPTIONS: EloOption[] = [
  {
    id: "no-elo",
    title: "No Elo",
    description: "New to chess or never rated",
    baseline: 400,
    skillLevel: "beginner",
  },
  {
    id: "beginner",
    title: "Beginner",
    description: "600 – 900 Elo",
    baseline: 750,
    skillLevel: "beginner",
  },
  {
    id: "intermediate",
    title: "Intermediate",
    description: "1,000 – 1,400 Elo",
    baseline: 1200,
    skillLevel: "intermediate",
  },
  {
    id: "advanced",
    title: "Advanced",
    description: "1,500+ Elo",
    baseline: 1600,
    skillLevel: "advanced",
  },
];

const BOARD_THEMES: BoardTheme[] = [
  { id: "tournament", name: "Tournament Green", light: "#eeeed2", dark: "#769656" },
  { id: "walnut", name: "Walnut Wood", light: "#edd6b0", dark: "#b88762" },
  { id: "icy-sea", name: "Icy Sea", light: "#dee3e6", dark: "#7896a4" },
  { id: "obsidian", name: "Obsidian Brass", light: "#3a3532", dark: "#1b1816" },
  { id: "coral", name: "Coral", light: "#f7e6d4", dark: "#d18b72" },
];

// --- Authentic Staunton SVG Chess Pieces ---
function MinimalPiece({
  type,
  isWhite = true,
  className = "w-8 h-8",
}: {
  type: "k" | "q" | "r" | "b" | "n" | "p";
  isWhite?: boolean;
  className?: string;
}) {
  const fillColor = isWhite ? "#fcfaf6" : "#141210";
  const strokeColor = isWhite ? "#c29b78" : "#a8a29e";
  const shadowFilter = isWhite
    ? "drop-shadow(0 2px 4px rgba(0,0,0,0.6))"
    : "drop-shadow(0 2px 4px rgba(255,255,255,0.18))";

  if (type === "n") {
    // Knight / Horse: Clear horse snout, pricked ears, mane bristles, and eye
    return (
      <svg className={className} style={{ filter: shadowFilter }} viewBox="0 0 45 45" fill="none">
        <path
          d="M23 8C20 8 16 10 14.5 13C13 11.5 11 11.5 9.5 13C8 14.5 9 17 11 18.5C9.5 20.5 8 23 8.5 26C9 28 11.5 29 13.5 28C11.5 30 11.5 33 13 35H32C32 35 32.5 30 31.5 27C30.5 24 28 22 29 19C30 16 30 13 28 10C26 7 24 8 23 8Z"
          fill={fillColor}
          stroke={strokeColor}
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
        <circle cx="14" cy="17" r="1.5" fill={isWhite ? "#141210" : "#fcfaf6"} />
        <path d="M18 10C18 13 22 14 24 16" stroke={strokeColor} strokeWidth="1.5" strokeLinecap="round" />
        <path d="M10.5 35H32.5V38.5H10.5V35Z" fill={fillColor} stroke={strokeColor} strokeWidth="1.8" strokeLinejoin="round" />
      </svg>
    );
  }

  if (type === "k") {
    // King: Prominent Latin Cross, royal crown arches, jeweled center
    return (
      <svg className={className} style={{ filter: shadowFilter }} viewBox="0 0 45 45" fill="none">
        {/* Prominent Cross */}
        <path d="M22.5 5.5V12.5M19 9H26" stroke={strokeColor} strokeWidth="2.2" strokeLinecap="round" />
        {/* Crown body */}
        <path
          d="M12.5 35H32.5C32.5 35 34.5 27 32 21C29.5 15 25.5 14 22.5 14C19.5 14 15.5 15 13 21C10.5 27 12.5 35 12.5 35Z"
          fill={fillColor}
          stroke={strokeColor}
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
        <path d="M11 35H34V39H11V35Z" fill={fillColor} stroke={strokeColor} strokeWidth="1.8" strokeLinejoin="round" />
        <circle cx="22.5" cy="22" r="2.5" fill={strokeColor} />
        <path d="M16 27C19 29 26 29 29 27" stroke={strokeColor} strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    );
  }

  if (type === "q") {
    // Queen: 5-pointed crown coronet with pearls & hourglass waist
    return (
      <svg className={className} style={{ filter: shadowFilter }} viewBox="0 0 45 45" fill="none">
        <circle cx="8" cy="13.5" r="2" fill={fillColor} stroke={strokeColor} strokeWidth="1.5" />
        <circle cx="15" cy="10" r="2" fill={fillColor} stroke={strokeColor} strokeWidth="1.5" />
        <circle cx="22.5" cy="8.5" r="2.2" fill={fillColor} stroke={strokeColor} strokeWidth="1.5" />
        <circle cx="30" cy="10" r="2" fill={fillColor} stroke={strokeColor} strokeWidth="1.5" />
        <circle cx="37" cy="13.5" r="2" fill={fillColor} stroke={strokeColor} strokeWidth="1.5" />
        <path
          d="M9.5 16L12.5 33H32.5L35.5 16L28 23L22.5 12L17 23L9.5 16Z"
          fill={fillColor}
          stroke={strokeColor}
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
        <path d="M11 33H34V37H11V33Z" fill={fillColor} stroke={strokeColor} strokeWidth="1.8" strokeLinejoin="round" />
      </svg>
    );
  }

  if (type === "r") {
    // Rook / Castle: 3 deep notched crenellations & fortress tower
    return (
      <svg className={className} style={{ filter: shadowFilter }} viewBox="0 0 45 45" fill="none">
        <path
          d="M12 12V18H16V14H20V18H25V14H29V18H33V12H12Z"
          fill={fillColor}
          stroke={strokeColor}
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
        <path
          d="M14 18L15.5 34H29.5L31 18H14Z"
          fill={fillColor}
          stroke={strokeColor}
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
        <path d="M11 34H34V38H11V34Z" fill={fillColor} stroke={strokeColor} strokeWidth="1.8" strokeLinejoin="round" />
        <path d="M15 26H30" stroke={strokeColor} strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    );
  }

  if (type === "b") {
    // Bishop: Mitre head with cross-slash
    return (
      <svg className={className} style={{ filter: shadowFilter }} viewBox="0 0 45 45" fill="none">
        <circle cx="22.5" cy="8.5" r="2" fill={strokeColor} />
        <path
          d="M16 35H29C29 35 32 25 29 19C26 13 22.5 11 22.5 11C22.5 11 19 13 16 19C13 25 16 35 16 35Z"
          fill={fillColor}
          stroke={strokeColor}
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
        <path d="M21 16L27 22" stroke={strokeColor} strokeWidth="1.8" strokeLinecap="round" />
        <path d="M13 35H32V38.5H13V35Z" fill={fillColor} stroke={strokeColor} strokeWidth="1.8" strokeLinejoin="round" />
      </svg>
    );
  }

  // Pawn: Distinct spherical orb head on collar neck
  return (
    <svg className={className} style={{ filter: shadowFilter }} viewBox="0 0 45 45" fill="none">
      <circle cx="22.5" cy="13.5" r="5.5" fill={fillColor} stroke={strokeColor} strokeWidth="1.8" />
      <path d="M17 21H28" stroke={strokeColor} strokeWidth="1.5" strokeLinecap="round" />
      <path
        d="M16 23C14 26 13 31 13 35H32C32 31 31 26 29 23C27 21.5 18 21.5 16 23Z"
        fill={fillColor}
        stroke={strokeColor}
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path d="M11 35H34V38.5H11V35Z" fill={fillColor} stroke={strokeColor} strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
  );
}

// --- Motion Transition Variants ---
const slideVariants = {
  initial: (direction: number) => ({
    opacity: 0,
    x: direction > 0 ? 32 : -32,
    filter: "blur(4px)",
  }),
  animate: {
    opacity: 1,
    x: 0,
    filter: "blur(0px)",
    transition: {
      type: "spring" as const,
      stiffness: 380,
      damping: 32,
    },
  },
  exit: (direction: number) => ({
    opacity: 0,
    x: direction > 0 ? -32 : 32,
    filter: "blur(4px)",
    transition: {
      duration: 0.16,
      ease: "easeInOut" as const,
    },
  }),
};

// --- Interactive Smothered Mate Vignette ---
function SmotheredMateVignette() {
  const [animPhase, setAnimPhase] = useState<"idle" | "jump" | "mate">("idle");

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (animPhase === "idle") {
      timer = setTimeout(() => setAnimPhase("jump"), 1100);
    } else if (animPhase === "jump") {
      timer = setTimeout(() => setAnimPhase("mate"), 700);
    } else if (animPhase === "mate") {
      timer = setTimeout(() => setAnimPhase("idle"), 2800);
    }
    return () => clearTimeout(timer);
  }, [animPhase]);

  const isCheckmated = animPhase === "mate";

  return (
    <div className="my-auto flex flex-col items-center justify-center relative py-2">
      {/* 4x4 Cropped Chess Board (240px x 240px = 60px/sq) */}
      <div
        className="w-60 h-60 rounded-2xl grid grid-cols-4 grid-rows-4 overflow-hidden border border-white/[0.08] shadow-2xl shadow-black relative"
        style={{
          maskImage: "radial-gradient(circle at center, black 65%, transparent 98%)",
          WebkitMaskImage: "radial-gradient(circle at center, black 65%, transparent 98%)",
        }}
      >
        {[...Array(16)].map((_, i) => {
          const row = Math.floor(i / 4);
          const col = i % 4;
          const isDark = (row + col) % 2 === 1;

          // Square 0 (row 0, col 0): Black King (smothered in the corner)
          const isKingSquare = i === 0;
          // Square 1 (row 0, col 1): Black Rook (blocks King right)
          const isRookSquare = i === 1;
          // Square 4 (row 1, col 0): Black Pawn (blocks King bottom)
          const isPawn1Square = i === 4;
          // Square 5 (row 1, col 1): Black Pawn (blocks King diagonal)
          const isPawn2Square = i === 5;
          // Square 6 (row 1, col 2): Landing checkmate square for White Knight
          const isTargetSquare = i === 6;
          // Square 13 (row 3, col 1): Starting square for White Knight
          const isKnightStartSquare = i === 13;

          return (
            <div
              key={i}
              className={`w-full h-full flex items-center justify-center relative transition-colors duration-300 ${
                isKingSquare && isCheckmated
                  ? "bg-red-600/70 border-2 border-red-500 shadow-[inset_0_0_24px_rgba(220,38,38,0.9)]"
                  : isTargetSquare && isCheckmated
                  ? "bg-amber-500/25 shadow-[inset_0_0_16px_rgba(245,158,11,0.35)]"
                  : ""
              }`}
              style={{
                backgroundColor:
                  isKingSquare && isCheckmated
                    ? undefined
                    : isDark
                    ? "#161311"
                    : "#26221f",
              }}
            >
              {/* 1. Black King at square 0 - Topples to the left without reducing scale! */}
              {isKingSquare && (
                <motion.div
                  animate={
                    isCheckmated
                      ? {
                          rotate: -80,
                          y: 2,
                          x: 0,
                          scale: 1,
                          transition: {
                            type: "spring",
                            stiffness: 260,
                            damping: 14,
                          },
                        }
                      : {
                          rotate: 0,
                          y: 0,
                          x: 0,
                          scale: 1,
                          transition: { duration: 0.3 },
                        }
                  }
                  style={{ transformOrigin: "center" }}
                  className="relative z-10 flex items-center justify-center"
                >
                  <img
                    src="/Sprites/b_king.svg"
                    alt="Black King"
                    className="w-12 h-12 object-contain select-none pointer-events-none drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)] drop-shadow-[0_0_1px_rgba(255,255,255,0.4)]"
                  />
                </motion.div>
              )}

              {/* 2. Smothering Black army */}
              {isRookSquare && (
                <img
                  src="/Sprites/b_rook.svg"
                  alt="Black Rook"
                  className="w-11 h-11 object-contain select-none pointer-events-none drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)] drop-shadow-[0_0_1px_rgba(255,255,255,0.4)]"
                />
              )}
              {isPawn1Square && (
                <img
                  src="/Sprites/b_pawn.svg"
                  alt="Black Pawn"
                  className="w-10 h-10 object-contain select-none pointer-events-none drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)] drop-shadow-[0_0_1px_rgba(255,255,255,0.4)]"
                />
              )}
              {isPawn2Square && (
                <img
                  src="/Sprites/b_pawn.svg"
                  alt="Black Pawn"
                  className="w-10 h-10 object-contain select-none pointer-events-none drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)] drop-shadow-[0_0_1px_rgba(255,255,255,0.4)]"
                />
              )}

              {/* 3. White Knight: leaps in authentic chess L-shape from square 13 (row 3, col 1) to square 6 (row 1, col 2) */}
              {isKnightStartSquare && (
                <motion.div
                  animate={
                    animPhase === "idle"
                      ? { x: 0, y: 0, scale: 1, rotate: 0 }
                      : {
                          x: [0, 0, 60],
                          y: [0, -120, -120],
                          scale: [1, 1.25, 1],
                          rotate: [0, -6, 0],
                        }
                  }
                  transition={
                    animPhase === "idle"
                      ? { duration: 0.3 }
                      : {
                          duration: 0.72,
                          times: [0, 0.55, 1],
                          ease: ["easeInOut", "easeOut"],
                        }
                  }
                  className="relative z-20 flex items-center justify-center cursor-default"
                >
                  <img
                    src="/Sprites/w_knight.svg"
                    alt="White Knight"
                    className="w-12 h-12 object-contain select-none pointer-events-none relative z-10 drop-shadow-[0_4px_8px_rgba(0,0,0,0.8)]"
                  />
                </motion.div>
              )}
            </div>
          );
        })}

        {/* Authentic Sharp Chess Broadcast Tactical L-Arrow (No Curves) */}
        {animPhase === "idle" && (
          <svg className="absolute inset-0 w-full h-full pointer-events-none z-15 overflow-visible">
            <motion.g
              animate={{ opacity: [0.82, 0.95, 0.82] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
              style={{
                filter: "drop-shadow(0 2px 6px rgba(0,0,0,0.5)) drop-shadow(0 0 10px rgba(245,158,11,0.45))",
              }}
            >
              {/* Crisp Right-Angle L-shaft: 2 squares UP -> sharp 90-deg turn -> 1 square RIGHT */}
              <path
                d="M 90 180 L 90 90 L 132 90"
                fill="none"
                stroke="#f59e0b"
                strokeWidth="10"
                strokeLinecap="round"
                strokeLinejoin="miter"
                opacity="0.88"
              />
              {/* Sharp Broadcast Arrowhead aligned with shaft into center of target square (150, 90) */}
              <polygon
                points="150,90 128,76 133,90 128,104"
                fill="#f59e0b"
                opacity="0.9"
              />
            </motion.g>
          </svg>
        )}
      </div>
    </div>
  );
}

export default function RootPage() {
  const router = useRouter();

  // State machine navigation
  const [step, setStep] = useState<FlowStep>("gate");
  const [direction, setDirection] = useState<number>(1);

  // User calibration choices
  const [selectedElo, setSelectedElo] = useState<EloOption>(ELO_OPTIONS[0]);
  const [selectedGoal, setSelectedGoal] = useState<number>(1400);
  const [selectedTheme, setSelectedTheme] = useState<BoardTheme>(BOARD_THEMES[1]); // Walnut default

  // Auth form state
  const [authMode, setAuthMode] = useState<"signup" | "signin">("signup");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Auto-redirect if already signed in
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const hasAccount = window.localStorage.getItem("chess_reel_account");
      if (hasAccount) {
        router.replace("/play");
      }
    } catch {}
  }, [router]);

  // Compute goal options dynamically based on chosen starting Elo
  const availableGoals: GoalOption[] = React.useMemo(() => {
    const base = selectedElo.baseline;
    const goals: GoalOption[] = [];

    if (base < 1000) goals.push({ value: 1000, label: "1,000 Elo", badge: "Club Player" });
    if (base < 1400) goals.push({ value: 1400, label: "1,400 Elo", badge: "Tactical Striker" });
    goals.push({ value: 1800, label: "1,800 Elo", badge: "Expert" });
    goals.push({ value: 2200, label: "2,200+ Elo", badge: "Master Instinct" });

    return goals;
  }, [selectedElo]);

  // Ensure selected goal remains valid when starting Elo changes
  useEffect(() => {
    if (availableGoals.length > 0) {
      const currentValid = availableGoals.some((g) => g.value === selectedGoal);
      if (!currentValid) {
        setSelectedGoal(availableGoals[0].value);
      }
    }
  }, [availableGoals, selectedGoal]);

  // Step transition helpers
  const goTo = (nextStep: FlowStep, dir: number = 1) => {
    setDirection(dir);
    setStep(nextStep);
  };

  const handleBack = () => {
    if (step === "step-elo") goTo("gate", -1);
    else if (step === "step-goal") goTo("step-elo", -1);
    else if (step === "step-board") goTo("step-goal", -1);
    else if (step === "auth") {
      if (authMode === "signin") goTo("gate", -1);
      else goTo("step-board", -1);
    }
  };

  // Progress index for top horizontal segments (1: elo, 2: goal, 3: board, 3: auth-signup)
  const activeProgressSegment =
    step === "step-elo"
      ? 1
      : step === "step-goal"
      ? 2
      : step === "step-board" || (step === "auth" && authMode === "signup")
      ? 3
      : 0;

  // Persist calibration settings into localStorage
  const saveCalibrationToStorage = () => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem("chess_reel_elo", String(selectedElo.baseline));
      window.localStorage.setItem("chess_reel_target_elo", String(selectedGoal));
      window.localStorage.setItem("chess_reel_board_theme", selectedTheme.id);
    } catch {}
  };

  // Trigger Google OAuth with calibrated skill level
  const handleGoogleAuth = () => {
    saveCalibrationToStorage();
    const returnUrl = encodeURIComponent("/play");
    window.location.href = `/api/auth/google?skillLevel=${selectedElo.skillLevel}&returnUrl=${returnUrl}`;
  };

  // Handle direct guest access
  const handleGuestEnter = () => {
    saveCalibrationToStorage();
    router.push("/play");
  };

  // Handle username/password account creation or login
  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);

    const cleanUser = username.trim().toLowerCase();
    if (!cleanUser) {
      setAuthError("Please enter a username or email.");
      return;
    }
    if (!password || password.length < 6) {
      setAuthError("Password must be at least 6 characters.");
      return;
    }

    setIsSubmitting(true);
    saveCalibrationToStorage();

    try {
      if (authMode === "signup") {
        const res = await fetch("/api/user/account", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username: cleanUser,
            password,
            skillLevel: selectedElo.skillLevel,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          setAuthError(data.error || "Could not create account.");
          setIsSubmitting(false);
          return;
        }

        if (data.user) {
          window.localStorage.setItem("chess_reel_account", JSON.stringify(data.user));
          window.localStorage.setItem("chess_reel_elo", String(data.user.elo || selectedElo.baseline));
          document.cookie = `chess_reel_session=${encodeURIComponent(data.user.id)}; path=/; max-age=${60 * 60 * 24 * 30}`;
          window.dispatchEvent(new Event("account-updated"));
          router.push("/play");
        }
      } else {
        const res = await fetch("/api/user/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username: cleanUser,
            password,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          setAuthError(data.error || "Could not sign in.");
          setIsSubmitting(false);
          return;
        }

        if (data.user) {
          window.localStorage.setItem("chess_reel_account", JSON.stringify(data.user));
          if (data.user.elo) {
            window.localStorage.setItem("chess_reel_elo", String(data.user.elo));
          }
          if (data.user.plan) {
            window.localStorage.setItem("chess_reel_plan", data.user.plan);
            window.dispatchEvent(new Event("plan-updated"));
          }
          document.cookie = `chess_reel_session=${encodeURIComponent(data.user.id)}; path=/; max-age=${60 * 60 * 24 * 30}`;
          window.dispatchEvent(new Event("account-updated"));
          router.push("/play");
        }
      }
    } catch {
      setAuthError("Network error. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="h-dvh w-screen overflow-hidden select-none bg-[#0a0908] text-[#f5f2eb] flex flex-col items-center justify-center p-4 sm:p-6 font-sans">
      <div className="max-w-[400px] w-full h-full max-h-[720px] flex flex-col justify-between relative">
        {/* --- Top Progress Bar & Back Navigation (Steps 1, 2, 3, and Auth) --- */}
        {step !== "gate" && (
          <div className="flex items-center gap-3 w-full pt-2 pb-4 shrink-0">
            <button
              onClick={handleBack}
              type="button"
              className="w-8 h-8 -ml-1 rounded-full flex items-center justify-center text-stone-400 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
              aria-label="Go back"
            >
              <ChevronLeft className="w-5 h-5 stroke-[1.5]" />
            </button>

            {/* 3 Progress Segments */}
            <div className="flex-1 flex items-center gap-1.5">
              {[1, 2, 3].map((seg) => (
                <div
                  key={seg}
                  className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                    activeProgressSegment >= seg
                      ? "bg-[#c29b78]"
                      : "bg-white/[0.08]"
                  }`}
                />
              ))}
            </div>
          </div>
        )}

        {/* --- Central State Machine Surface --- */}
        <div className="flex-1 w-full relative overflow-hidden flex flex-col">
          <AnimatePresence mode="wait" custom={direction}>
            {/* ============================================================ */}
            {/* STATE 0: 'gate' (The Minimal App Entry)                      */}
            {/* ============================================================ */}
            {step === "gate" && (
              <motion.div
                key="gate"
                custom={direction}
                variants={slideVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                className="w-full h-full flex flex-col justify-between pt-4"
              >
                {/* Header Wordmark */}
                <div className="text-center shrink-0">
                  <span className="text-[11px] font-semibold tracking-[0.3em] text-[#c29b78] uppercase font-mono">
                    DOOMCHESS
                  </span>
                  <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[#f5f2eb] leading-tight mt-2">
                    Turn doomscrolling into instinct.
                  </h1>
                  <p className="text-xs text-[#78716c] font-normal tracking-wide mt-1.5">
                    Infinite tactical chess reels.
                  </p>
                </div>

                {/* Animated Smothered Mate Vignette */}
                <SmotheredMateVignette />

                {/* Bottom Pinned CTAs */}
                <div className="w-full space-y-2.5 pb-2 shrink-0">
                  <button
                    onClick={() => goTo("step-elo", 1)}
                    type="button"
                    className="w-full h-12 rounded-full bg-[#c29b78] hover:bg-[#d4b08f] text-[#0a0908] font-semibold text-sm tracking-wide transition-all duration-150 active:scale-[0.98] shadow-lg shadow-[#c29b78]/20 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>Get Started</span>
                    <ArrowRight className="w-4 h-4 stroke-[2]" />
                  </button>

                  <button
                    onClick={handleGoogleAuth}
                    type="button"
                    className="w-full h-12 rounded-full bg-[#12100e] hover:bg-[#1a1714] border border-white/[0.08] hover:border-white/20 text-[#f5f2eb] font-medium text-sm transition-all duration-150 active:scale-[0.98] flex items-center justify-center gap-3 cursor-pointer"
                  >
                    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                      <path
                        fill="#EA4335"
                        d="M12 5c1.6 0 3 .6 4.1 1.7l3.1-3.1C17.3 1.8 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.3 9 5 12 5z"
                      />
                      <path
                        fill="#4285F4"
                        d="M23.5 12.3c0-.8-.1-1.7-.2-2.3H12v4.6h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.9z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3 0-.8.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 12.3 0 15s.7 5.3 1.9 7.7l3.7-2.9z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.3-6.4-5.2L1.9 16c1.8 3.7 5.6 7 10.1 7z"
                      />
                    </svg>
                    <span>Continue with Google</span>
                  </button>

                  <div className="pt-2 text-center">
                    <button
                      onClick={() => {
                        setAuthMode("signin");
                        goTo("auth", 1);
                      }}
                      type="button"
                      className="text-xs text-[#78716c] hover:text-[#c29b78] transition-colors cursor-pointer"
                    >
                      Already have an account? <span className="underline underline-offset-4">Sign in</span>
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ============================================================ */}
            {/* STATE 1: 'step-elo' (Current Rating Calibration)             */}
            {/* ============================================================ */}
            {step === "step-elo" && (
              <motion.div
                key="step-elo"
                custom={direction}
                variants={slideVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                className="w-full h-full flex flex-col justify-between"
              >
                <div>
                  <h2 className="text-xl font-semibold tracking-tight text-[#f5f2eb]">
                    Where are you starting from?
                  </h2>
                  <p className="text-xs text-[#78716c] mt-1">
                    Calibrate your initial tactical feed.
                  </p>

                  <div className="space-y-2.5 mt-6">
                    {ELO_OPTIONS.map((opt) => {
                      const isSelected = selectedElo.id === opt.id;
                      return (
                        <button
                          key={opt.id}
                          onClick={() => {
                            setSelectedElo(opt);
                          }}
                          type="button"
                          className={`w-full p-4 rounded-2xl text-left border transition-all duration-150 flex items-center justify-between cursor-pointer ${
                            isSelected
                              ? "bg-[#c29b78]/[0.08] border-[#c29b78] shadow-sm shadow-[#c29b78]/10"
                              : "bg-[#12100e] border-white/[0.07] hover:border-white/20"
                          }`}
                        >
                          <div>
                            <div className="text-sm font-medium text-[#f5f2eb]">
                              {opt.title}
                            </div>
                            <div className="text-xs text-[#78716c] mt-0.5">
                              {opt.description}
                            </div>
                          </div>

                          <div
                            className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${
                              isSelected
                                ? "border-[#c29b78] bg-[#c29b78]"
                                : "border-white/20 bg-transparent"
                            }`}
                          >
                            {isSelected && <Check className="w-3 h-3 text-[#0a0908] stroke-[3]" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="w-full pb-2 shrink-0">
                  <button
                    onClick={() => goTo("step-goal", 1)}
                    type="button"
                    className="w-full h-12 rounded-full bg-[#c29b78] hover:bg-[#d4b08f] text-[#0a0908] font-semibold text-sm tracking-wide transition-all duration-150 active:scale-[0.98] shadow-lg shadow-[#c29b78]/20 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>Continue</span>
                    <ArrowRight className="w-4 h-4 stroke-[2]" />
                  </button>
                </div>
              </motion.div>
            )}

            {/* ============================================================ */}
            {/* STATE 2: 'step-goal' (Target Rating Goal)                    */}
            {/* ============================================================ */}
            {step === "step-goal" && (
              <motion.div
                key="step-goal"
                custom={direction}
                variants={slideVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                className="w-full h-full flex flex-col justify-between"
              >
                <div>
                  <h2 className="text-xl font-semibold tracking-tight text-[#f5f2eb]">
                    Set your target rating.
                  </h2>
                  <p className="text-xs text-[#78716c] mt-1">
                    Your difficulty curve will scale toward this mark.
                  </p>

                  {/* Minimal Trajectory Badge */}
                  <div className="mt-4 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-xs text-stone-300">
                    <span className="text-stone-400 font-mono">{selectedElo.baseline}</span>
                    <span className="text-[#c29b78]">→</span>
                    <span className="text-[#c29b78] font-semibold font-mono">{selectedGoal} Elo</span>
                  </div>

                  <div className="space-y-2.5 mt-5">
                    {availableGoals.map((goal) => {
                      const isSelected = selectedGoal === goal.value;
                      return (
                        <button
                          key={goal.value}
                          onClick={() => setSelectedGoal(goal.value)}
                          type="button"
                          className={`w-full p-4 rounded-2xl text-left border transition-all duration-150 flex items-center justify-between cursor-pointer ${
                            isSelected
                              ? "bg-[#c29b78]/[0.08] border-[#c29b78] shadow-sm shadow-[#c29b78]/10"
                              : "bg-[#12100e] border-white/[0.07] hover:border-white/20"
                          }`}
                        >
                          <div>
                            <div className="text-sm font-medium text-[#f5f2eb]">
                              {goal.label}
                            </div>
                            <div className="text-xs text-[#78716c] mt-0.5">
                              {goal.badge}
                            </div>
                          </div>

                          <div
                            className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${
                              isSelected
                                ? "border-[#c29b78] bg-[#c29b78]"
                                : "border-white/20 bg-transparent"
                            }`}
                          >
                            {isSelected && <Check className="w-3 h-3 text-[#0a0908] stroke-[3]" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="w-full pb-2 shrink-0">
                  <button
                    onClick={() => goTo("step-board", 1)}
                    type="button"
                    className="w-full h-12 rounded-full bg-[#c29b78] hover:bg-[#d4b08f] text-[#0a0908] font-semibold text-sm tracking-wide transition-all duration-150 active:scale-[0.98] shadow-lg shadow-[#c29b78]/20 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>Continue</span>
                    <ArrowRight className="w-4 h-4 stroke-[2]" />
                  </button>
                </div>
              </motion.div>
            )}

            {/* ============================================================ */}
            {/* STATE 3: 'step-board' (Board Theme Personalization)          */}
            {/* ============================================================ */}
            {step === "step-board" && (
              <motion.div
                key="step-board"
                custom={direction}
                variants={slideVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                className="w-full h-full flex flex-col justify-between"
              >
                <div>
                  <h2 className="text-xl font-semibold tracking-tight text-[#f5f2eb]">
                    Choose your board.
                  </h2>
                  <p className="text-xs text-[#78716c] mt-1">
                    Match your aesthetic in the feed.
                  </p>

                  {/* Interactive 4x4 Mini Board Preview */}
                  <div className="my-4 flex items-center justify-center">
                    <div className="w-48 h-48 rounded-2xl grid grid-cols-4 grid-rows-4 overflow-hidden border border-white/[0.1] shadow-2xl shadow-black transition-colors duration-200">
                      {[...Array(16)].map((_, i) => {
                        const row = Math.floor(i / 4);
                        const col = i % 4;
                        const isDark = (row + col) % 2 === 1;

                        return (
                          <div
                            key={i}
                            className="w-full h-full flex items-center justify-center transition-colors duration-200"
                            style={{
                              backgroundColor: isDark ? selectedTheme.dark : selectedTheme.light,
                            }}
                          >
                            {i === 1 && <MinimalPiece type="k" isWhite={false} className="w-6 h-6" />}
                            {i === 2 && <MinimalPiece type="q" isWhite={false} className="w-6 h-6" />}
                            {i === 9 && <MinimalPiece type="n" isWhite={true} className="w-6 h-6" />}
                            {i === 10 && <MinimalPiece type="p" isWhite={true} className="w-5 h-5" />}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Theme Swatches */}
                  <div className="space-y-1.5 mt-2">
                    {BOARD_THEMES.map((theme) => {
                      const isSelected = selectedTheme.id === theme.id;
                      return (
                        <button
                          key={theme.id}
                          onClick={() => setSelectedTheme(theme)}
                          type="button"
                          className={`w-full py-2.5 px-3 rounded-xl border flex items-center justify-between transition-all duration-150 cursor-pointer ${
                            isSelected
                              ? "bg-[#c29b78]/[0.08] border-[#c29b78]"
                              : "bg-[#12100e] border-white/[0.06] hover:border-white/20"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            {/* Two-tone circle swatch */}
                            <div className="w-5 h-5 rounded-full overflow-hidden flex border border-white/20 shrink-0">
                              <div className="w-1/2 h-full" style={{ backgroundColor: theme.light }} />
                              <div className="w-1/2 h-full" style={{ backgroundColor: theme.dark }} />
                            </div>
                            <span className="text-xs font-medium text-[#f5f2eb]">
                              {theme.name}
                            </span>
                          </div>

                          {isSelected && (
                            <Check className="w-3.5 h-3.5 text-[#c29b78] stroke-[2.5]" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="w-full pb-2 shrink-0">
                  <button
                    onClick={() => {
                      setAuthMode("signup");
                      goTo("auth", 1);
                    }}
                    type="button"
                    className="w-full h-12 rounded-full bg-[#c29b78] hover:bg-[#d4b08f] text-[#0a0908] font-semibold text-sm tracking-wide transition-all duration-150 active:scale-[0.98] shadow-lg shadow-[#c29b78]/20 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>Continue</span>
                    <ArrowRight className="w-4 h-4 stroke-[2]" />
                  </button>
                </div>
              </motion.div>
            )}

            {/* ============================================================ */}
            {/* STATE 4: 'auth' (Lock In Profile & Enter Feed)               */}
            {/* ============================================================ */}
            {step === "auth" && (
              <motion.div
                key="auth"
                custom={direction}
                variants={slideVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                className="w-full h-full flex flex-col justify-between"
              >
                <div>
                  <h2 className="text-xl font-semibold tracking-tight text-[#f5f2eb]">
                    {authMode === "signup" ? "Save your board and start swiping." : "Welcome back."}
                  </h2>

                  {/* Summary Pill */}
                  {authMode === "signup" && (
                    <div className="mt-2.5 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] text-[11px] text-stone-300">
                      <span className="text-stone-400 font-mono">{selectedElo.baseline}</span>
                      <span className="text-[#c29b78]">→</span>
                      <span className="text-[#c29b78] font-semibold font-mono">{selectedGoal} Elo</span>
                      <span className="text-stone-600">•</span>
                      <span className="text-stone-300">{selectedTheme.name}</span>
                    </div>
                  )}

                  {/* Google OAuth Button */}
                  <div className="mt-5">
                    <button
                      onClick={handleGoogleAuth}
                      type="button"
                      className="w-full h-11 rounded-2xl bg-[#12100e] hover:bg-[#1a1714] border border-white/[0.1] hover:border-white/20 text-[#f5f2eb] font-medium text-xs sm:text-sm transition-all duration-150 active:scale-[0.98] flex items-center justify-center gap-3 cursor-pointer"
                    >
                      <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                        <path
                          fill="#EA4335"
                          d="M12 5c1.6 0 3 .6 4.1 1.7l3.1-3.1C17.3 1.8 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.3 9 5 12 5z"
                        />
                        <path
                          fill="#4285F4"
                          d="M23.5 12.3c0-.8-.1-1.7-.2-2.3H12v4.6h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.9z"
                        />
                        <path
                          fill="#FBBC05"
                          d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3 0-.8.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 12.3 0 15s.7 5.3 1.9 7.7l3.7-2.9z"
                        />
                        <path
                          fill="#34A853"
                          d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.3-6.4-5.2L1.9 16c1.8 3.7 5.6 7 10.1 7z"
                        />
                      </svg>
                      <span>Continue with Google</span>
                    </button>
                  </div>

                  {/* Minimal Hairline Divider */}
                  <div className="flex items-center gap-3 my-4">
                    <div className="flex-1 h-px bg-white/[0.08]" />
                    <span className="text-[11px] uppercase tracking-wider text-[#78716c]">or</span>
                    <div className="flex-1 h-px bg-white/[0.08]" />
                  </div>

                  {/* Credentials Form */}
                  <form onSubmit={handleCredentialsSubmit} className="space-y-2.5">
                    <div>
                      <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="Username or email"
                        autoCapitalize="none"
                        autoComplete="username"
                        className="w-full h-11 px-3.5 rounded-xl bg-white/[0.03] border border-white/10 focus:border-[#c29b78] text-xs sm:text-sm text-[#f5f2eb] placeholder:text-stone-600 outline-none transition-colors"
                      />
                    </div>

                    <div>
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Password (min. 6 characters)"
                        autoComplete={authMode === "signup" ? "new-password" : "current-password"}
                        className="w-full h-11 px-3.5 rounded-xl bg-white/[0.03] border border-white/10 focus:border-[#c29b78] text-xs sm:text-sm text-[#f5f2eb] placeholder:text-stone-600 outline-none transition-colors"
                      />
                    </div>

                    {authError && (
                      <div className="text-xs text-rose-400 bg-rose-950/30 border border-rose-800/40 rounded-lg p-2.5">
                        {authError}
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full h-11 rounded-2xl bg-[#c29b78] hover:bg-[#d4b08f] text-[#0a0908] font-semibold text-xs sm:text-sm tracking-wide transition-all duration-150 active:scale-[0.98] shadow-lg shadow-[#c29b78]/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-1"
                    >
                      {isSubmitting ? (
                        <div className="w-4 h-4 border-2 border-stone-900 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <span>{authMode === "signup" ? "Create Account" : "Sign In"}</span>
                      )}
                    </button>
                  </form>
                </div>

                {/* Bottom Mode Switch & Guest Bypass */}
                <div className="w-full pt-3 pb-2 text-center space-y-2 shrink-0">
                  <div>
                    <button
                      type="button"
                      onClick={() => {
                        setAuthMode(authMode === "signup" ? "signin" : "signup");
                        setAuthError(null);
                      }}
                      className="text-xs text-[#78716c] hover:text-[#c29b78] transition-colors cursor-pointer"
                    >
                      {authMode === "signup" ? (
                        <>Already have an account? <span className="underline underline-offset-4">Sign in</span></>
                      ) : (
                        <>New here? <span className="underline underline-offset-4">Calibrate your feed</span></>
                      )}
                    </button>
                  </div>

                  <div>
                    <button
                      type="button"
                      onClick={handleGuestEnter}
                      className="text-[11px] text-stone-500 hover:text-stone-300 transition-colors cursor-pointer"
                    >
                      Explore feed as guest →
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
