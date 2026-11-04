"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ArrowRight, Check, LogIn, Sparkles } from "lucide-react";
import { BOARD_THEMES, BoardTheme, setStoredBoardTheme, getStoredBoardTheme } from "@/lib/boardThemes";
import { clearGuestLocalSession, isGuestAccount } from "@/lib/guestAccount";
import { prefetchPuzzles, clearAllUserAndPuzzleCache } from "@/lib/puzzleCache";
import { hydrateUserSession } from "@/lib/sessionHydration";

// --- Types ---
type FlowStep = "gate" | "step-elo" | "step-goal" | "step-board" | "auth" | "pro-upsell";

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

function GoogleLogo({ className = "w-4 h-4 shrink-0" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
      />
    </svg>
  );
}

function getSkillCategory(elo: number): {
  tier: "Beginner" | "Intermediate" | "Advanced";
  desc: string;
  color: string;
  border: string;
  bg: string;
  skillLevel: "beginner" | "intermediate" | "advanced";
} {
  if (elo < 1100) {
    return {
      tier: "Beginner",
      desc: "Pattern recognition & piece coordination",
      color: "text-emerald-400",
      border: "border-emerald-500/30",
      bg: "bg-emerald-500/15",
      skillLevel: "beginner",
    };
  }
  if (elo < 1650) {
    return {
      tier: "Intermediate",
      desc: "Forks, pins, skewers & tactical conversion",
      color: "text-[#c29b78]",
      border: "border-[#c29b78]/40",
      bg: "bg-[#c29b78]/15",
      skillLevel: "intermediate",
    };
  }
  return {
    tier: "Advanced",
    desc: "Complex deep calculations & instinct",
    color: "text-purple-400",
    border: "border-purple-500/30",
    bg: "bg-purple-500/15",
    skillLevel: "advanced",
  };
}

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
  const [startingElo, setStartingElo] = useState<number>(1000);
  const [targetElo, setTargetElo] = useState<number>(1400);
  const [selectedTheme, setSelectedTheme] = useState<BoardTheme>(() => getStoredBoardTheme());

  // Auth form state
  const [authMode, setAuthMode] = useState<"signup" | "signin">("signup");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Pending Google authenticated user (when new user signs in with Google, they go through onboarding calibration)
  const [pendingGoogleUser, setPendingGoogleUser] = useState<{
    googleId: string;
    email: string;
    name: string;
    avatar: string;
  } | null>(null);

  // Auto-redirect if already signed in, and inspect URL params for OAuth redirects
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const searchParams = new URLSearchParams(window.location.search);
      const stepParam = searchParams.get("step");
      const modeParam = searchParams.get("mode");
      const prefillParam = searchParams.get("prefill");
      const errorParam = searchParams.get("error");
      const oauthError = searchParams.get("oauth_error");
      const googleOnboarding = searchParams.get("google_onboarding");

      // Check if arriving from Google OAuth for fresh user onboarding calibration
      if (googleOnboarding === "1" || (stepParam === "step-elo" && !window.localStorage.getItem("chess_reel_account"))) {
        setStep("step-elo");
        const cookieMatch = document.cookie.match(/chess_reel_pending_google=([^;]+)/);
        if (cookieMatch && cookieMatch[1]) {
          try {
            const raw = decodeURIComponent(cookieMatch[1]);
            const parsed = JSON.parse(raw);
            setPendingGoogleUser(parsed);
            if (parsed.name) setName(parsed.name);
            if (parsed.email) {
              setEmail(parsed.email);
              setUsername(parsed.email.split("@")[0].toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 15));
            }
          } catch {}
        }
        window.history.replaceState({}, document.title, window.location.pathname);
        return;
      }

      if (stepParam === "auth" || modeParam === "signin") {
        setStep("auth");
        setAuthMode("signin");
        if (prefillParam) {
          setUsername(prefillParam);
        }
        if (errorParam === "account_exists") {
          setAuthError("An account with this Google email already exists. Please sign in below.");
        }
        window.history.replaceState({}, document.title, window.location.pathname);
        return;
      }

      if (oauthError) {
        setAuthError(`Authentication notification: ${oauthError.replace(/_/g, " ")}`);
        window.history.replaceState({}, document.title, window.location.pathname);
      }

      // Check for Google OAuth callback user cookie & redirect to play
      const oauthCookieMatch = document.cookie.match(/chess_reel_oauth_user=([^;]+)/);
      if (oauthCookieMatch && oauthCookieMatch[1]) {
        try {
          let raw = oauthCookieMatch[1];
          try {
            raw = decodeURIComponent(raw);
          } catch {}
          const oauthUser = JSON.parse(raw);
          if (oauthUser && oauthUser.id) {
            window.localStorage.setItem("chess_reel_account", JSON.stringify(oauthUser));
            if (oauthUser.elo) {
              window.localStorage.setItem("chess_reel_elo", String(oauthUser.elo));
              window.localStorage.setItem("chess_reel_user_elo", String(oauthUser.elo));
            }
            if (oauthUser.plan) {
              window.localStorage.setItem("chess_reel_plan", oauthUser.plan);
            }
            window.localStorage.removeItem("chess_reel_tier_session");
            window.localStorage.removeItem("chess_reel_tier_session_guest");
            window.localStorage.removeItem("chess_reel_last_solved_puzzle");
            document.cookie = "chess_reel_oauth_user=; path=/; max-age=0";
            router.replace("/play");
            return;
          }
        } catch {}
      }

      const hasAccount = window.localStorage.getItem("chess_reel_account");
      if (hasAccount) {
        try {
          const parsed = JSON.parse(hasAccount);
          if (isGuestAccount(parsed)) {
            clearGuestLocalSession();
            setStep("auth");
            setAuthMode("signup");
            return;
          }
        } catch {
          clearGuestLocalSession();
          setStep("auth");
          setAuthMode("signup");
          return;
        }
        router.replace("/play");
        return;
      }

      if (!stepParam && !modeParam && !googleOnboarding) {
        setStep("gate");
      }
    } catch {}
  }, [router]);

  // Reset flow to entry gate upon logout / account clearing
  useEffect(() => {
    const handleAccountUpdate = () => {
      const hasAccount = window.localStorage.getItem("chess_reel_account");
      if (!hasAccount) {
        setStep("gate");
        setAuthMode("signup");
        setUsername("");
        setPassword("");
        setConfirmPassword("");
        setName("");
        setEmail("");
        setAuthError(null);
      }
    };
    window.addEventListener("account-updated", handleAccountUpdate);
    return () => window.removeEventListener("account-updated", handleAccountUpdate);
  }, []);

  // Keep target Elo higher than starting Elo automatically
  useEffect(() => {
    if (targetElo < startingElo + 100) {
      setTargetElo(Math.min(2600, startingElo + 300));
    }
  }, [startingElo, targetElo]);

  // Derived current skill category
  const skill = getSkillCategory(startingElo);

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
      window.localStorage.setItem("chess_reel_elo", String(startingElo));
      window.localStorage.setItem("chess_reel_target_elo", String(targetElo));
      setStoredBoardTheme(selectedTheme.id);
    } catch {}
  };

  // Finalize new account creation for user who authenticated via Google and completed onboarding calibration
  const handleCompleteGoogleOnboarding = async () => {
    if (!pendingGoogleUser) return;
    setIsSubmitting(true);
    setAuthError(null);
    saveCalibrationToStorage();

    try {
      const res = await fetch("/api/user/google-auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          googleId: pendingGoogleUser.googleId,
          email: pendingGoogleUser.email,
          name: pendingGoogleUser.name,
          username: username.trim() || undefined,
          avatar: pendingGoogleUser.avatar,
          elo: startingElo,
          startingElo,
          targetElo,
          theme: selectedTheme.id,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setAuthError(data.error || "Could not complete registration.");
        setIsSubmitting(false);
        return;
      }

      if (data.user) {
        clearAllUserAndPuzzleCache();
        hydrateUserSession(data.user);
        prefetchPuzzles(startingElo, 5, data.user.id).catch(() => {});
        document.cookie = "chess_reel_pending_google=; path=/; max-age=0";
        document.cookie = `chess_reel_session=${encodeURIComponent(data.user.id)}; path=/; max-age=${60 * 60 * 24 * 30}`;
        setStep("pro-upsell");
      }
    } catch {
      setAuthError("Network error. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Trigger Google OAuth: mode can be 'signup' (new accounts from onboarding) or 'signin' (existing accounts)
  const handleGoogleAuth = (mode: "signup" | "signin" = authMode) => {
    saveCalibrationToStorage();
    const returnUrl = encodeURIComponent("/play");
    const skillLevel = skill.skillLevel;
    const eloParam = `&startingElo=${startingElo}&targetElo=${targetElo}&theme=${encodeURIComponent(selectedTheme.id)}`;
    window.location.href = `/api/auth/google?mode=${mode}&skillLevel=${skillLevel}${eloParam}&returnUrl=${returnUrl}`;
  };

  // Handle username/password account creation or login
  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);

    if (authMode === "signup") {
      if (!name.trim()) {
        setAuthError("Please enter your name.");
        return;
      }

      const cleanEmail = email.trim().toLowerCase();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!cleanEmail || !emailRegex.test(cleanEmail)) {
        setAuthError("Please enter a valid email address.");
        return;
      }

      const cleanUser = username.trim().toLowerCase();
      if (!cleanUser || !/^[a-z0-9_]{3,20}$/.test(cleanUser)) {
        setAuthError("Username must be 3-20 characters long (letters, numbers, underscores).");
        return;
      }

      if (!password || password.length < 6) {
        setAuthError("Password must be at least 6 characters.");
        return;
      }

      if (password !== confirmPassword) {
        setAuthError("Passwords do not match.");
        return;
      }

      setIsSubmitting(true);
      saveCalibrationToStorage();

      try {
        const res = await fetch("/api/user/account", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            displayName: name.trim(),
            email: cleanEmail,
            username: cleanUser,
            password,
            skillLevel: skill.skillLevel,
            startingElo,
            elo: startingElo,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          setAuthError(data.error || "Could not create account.");
          setIsSubmitting(false);
          return;
        }

        if (data.user) {
          clearAllUserAndPuzzleCache();
          hydrateUserSession(data.user);
          prefetchPuzzles(data.user.elo || 800, 5, data.user.id).catch(() => {});
          document.cookie = `chess_reel_session=${encodeURIComponent(data.user.id)}; path=/; max-age=${60 * 60 * 24 * 30}`;
          setStep("pro-upsell");
        }
      } catch {
        setAuthError("Network error. Please try again.");
      } finally {
        setIsSubmitting(false);
      }
    } else {
      const cleanUser = username.trim().toLowerCase();
      if (!cleanUser) {
        setAuthError("Please enter your username or email.");
        return;
      }
      if (!password) {
        setAuthError("Please enter your password.");
        return;
      }

      setIsSubmitting(true);
      saveCalibrationToStorage();

      try {
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
          clearAllUserAndPuzzleCache();
          hydrateUserSession(data.user);
          prefetchPuzzles(data.user.elo || 800, 5, data.user.id).catch(() => {});
          document.cookie = `chess_reel_session=${encodeURIComponent(data.user.id)}; path=/; max-age=${60 * 60 * 24 * 30}`;
          router.replace("/play");
        }
      } catch {
        setAuthError("Network error. Please try again.");
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  // Upgrade to Pro handler from post-registration upsell
  const handleUpgradeToPro = async () => {
    try {
      const accRaw = window.localStorage.getItem("chess_reel_account");
      let userId: string | undefined;
      if (accRaw) {
        const acc = JSON.parse(accRaw);
        acc.plan = "premium";
        userId = acc.id;
        window.localStorage.setItem("chess_reel_account", JSON.stringify(acc));
      }
      window.localStorage.setItem("chess_reel_plan", "premium");
      window.dispatchEvent(new Event("plan-updated"));
      window.dispatchEvent(new Event("account-updated"));

      if (userId) {
        await fetch("/api/user/upgrade", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId, plan: "premium" }),
        });
      }
    } catch (err) {
      console.error("Upgrade error:", err);
    } finally {
      router.push("/play");
    }
  };

  // If on post-registration upsell state
  if (step === "pro-upsell") {
    return (
      <div className="h-dvh max-w-[390px] mx-auto px-6 py-8 flex flex-col justify-between bg-[#0a0908] text-[#f5f2eb] select-none font-sans overflow-hidden">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#12100e] border border-white/10 text-[11px] text-[#c29b78] font-semibold uppercase tracking-widest">
            <Sparkles className="w-3.5 h-3.5 text-[#c29b78]" strokeWidth={1.5} />
            <span>PRO ACCESS</span>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-[#f5f2eb] mt-4">
            Unlock Grandmaster Training
          </h1>
          <div className="bg-[#12100e] border border-white/10 rounded-2xl p-4 space-y-3 mt-6">
            <div className="flex items-center gap-3 text-sm text-[#f5f2eb]">
              <Check className="w-4 h-4 text-[#c29b78] shrink-0" />
              <span>Targeted Motif Practice (Forks, Pins, Mate-in-1)</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-[#f5f2eb]">
              <Check className="w-4 h-4 text-[#c29b78] shrink-0" />
              <span>Unlimited Saved Puzzles & History Replay</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-[#f5f2eb]">
              <Check className="w-4 h-4 text-[#c29b78] shrink-0" />
              <span>Ad-Free Infinite Tactical Feed</span>
            </div>
          </div>
        </div>

        <div className="w-full space-y-2 pt-4">
          <button
            type="button"
            onClick={handleUpgradeToPro}
            className="w-full py-3.5 rounded-xl bg-[#c29b78] text-[#0a0908] font-semibold text-sm hover:bg-[#d4b08f] transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            Upgrade to Pro
          </button>
          <button
            type="button"
            onClick={() => router.push("/play")}
            className="w-full py-3 text-xs text-[#78716c] hover:text-[#f5f2eb] transition-colors cursor-pointer text-center"
          >
            Continue with Free Account
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-dvh w-screen overflow-hidden select-none bg-[#0a0908] text-[#f5f2eb] flex flex-col items-center justify-center p-3 sm:p-6 font-sans">
      <div className="max-w-[390px] w-full h-full max-h-[720px] flex flex-col justify-between relative overflow-hidden">
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
                    onClick={() => {
                      setAuthMode("signin");
                      setAuthError(null);
                      goTo("auth", 1);
                    }}
                    type="button"
                    className="w-full h-12 rounded-full bg-[#12100e] hover:bg-[#1a1714] border border-white/[0.08] hover:border-white/20 text-[#f5f2eb] font-medium text-sm transition-all duration-150 active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <LogIn className="w-4 h-4 stroke-[2]" />
                    <span>Sign In</span>
                  </button>
                </div>
              </motion.div>
            )}

            {/* ============================================================ */}
            {/* STATE 1: 'step-elo' (Starting Rating Calibration Slider)     */}
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
                  {pendingGoogleUser && (
                    <div className="mb-3 px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/10 flex items-center gap-2 self-start animate-in fade-in duration-200">
                      {pendingGoogleUser.avatar && pendingGoogleUser.avatar.startsWith("http") ? (
                        <img src={pendingGoogleUser.avatar} alt="Google Avatar" className="w-4 h-4 rounded-full object-cover" />
                      ) : (
                        <GoogleLogo className="w-3.5 h-3.5" />
                      )}
                      <span className="text-[11px] text-stone-300 font-medium">
                        Calibrating for <strong className="text-white">{pendingGoogleUser.name || pendingGoogleUser.email}</strong>
                      </span>
                    </div>
                  )}
                  <h2 className="text-xl font-semibold tracking-tight text-[#f5f2eb]">
                    Where are you starting from?
                  </h2>
                  <p className="text-xs text-[#78716c] mt-1">
                    Calibrate your initial tactical puzzle feed.
                  </p>

                  {/* Dynamic Rating Card */}
                  <div className="mt-5 p-5 rounded-2xl bg-[#12100e] border border-white/[0.08] relative overflow-hidden">
                    <div className="flex items-center justify-between">
                      <div className="flex items-baseline gap-2">
                        <span className="text-4xl font-mono font-bold text-[#f5f2eb]">
                          {startingElo}
                        </span>
                        <span className="text-xs font-mono uppercase text-[#78716c]">Elo</span>
                      </div>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${skill.bg} ${skill.color} border ${skill.border} tracking-wide`}
                      >
                        {skill.tier}
                      </span>
                    </div>
                    <p className="text-xs text-[#78716c] mt-2.5">
                      {skill.desc}
                    </p>
                  </div>

                  {/* Interactive Slider */}
                  <div className="mt-6 px-1">
                    <div className="relative flex items-center">
                      <input
                        type="range"
                        min={400}
                        max={2200}
                        step={25}
                        value={startingElo}
                        onChange={(e) => setStartingElo(Number(e.target.value))}
                        className="w-full h-2 rounded-lg appearance-none cursor-pointer bg-white/[0.08] accent-[#c29b78]
                          [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:h-6 
                          [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#c29b78] 
                          [&::-webkit-slider-thumb]:shadow-[0_0_12px_rgba(194,155,120,0.6)] [&::-webkit-slider-thumb]:border-2 
                          [&::-webkit-slider-thumb]:border-[#0a0908] [&::-webkit-slider-thumb]:cursor-pointer
                          [&::-moz-range-thumb]:w-6 [&::-moz-range-thumb]:h-6 [&::-moz-range-thumb]:rounded-full 
                          [&::-moz-range-thumb]:bg-[#c29b78] [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-[#0a0908]
                          [&::-moz-range-thumb]:cursor-pointer"
                        style={{
                          background: `linear-gradient(to right, #c29b78 0%, #c29b78 ${((startingElo - 400) / (2200 - 400)) * 100}%, rgba(255,255,255,0.08) ${((startingElo - 400) / (2200 - 400)) * 100}%, rgba(255,255,255,0.08) 100%)`,
                        }}
                      />
                    </div>

                    <div className="flex justify-between items-center text-[11px] font-mono text-[#78716c] mt-3">
                      <span>400</span>
                      <span className="text-[#a8a29e]">1,200</span>
                      <span>2,200+</span>
                    </div>
                  </div>

                  {/* Quick-snap tier buttons */}
                  <div className="grid grid-cols-3 gap-2 mt-5">
                    {[
                      { label: "Beginner", elo: 700 },
                      { label: "Intermediate", elo: 1200 },
                      { label: "Advanced", elo: 1700 },
                    ].map((tier) => {
                      const isActive = skill.tier === tier.label;
                      return (
                        <button
                          key={tier.label}
                          onClick={() => setStartingElo(tier.elo)}
                          type="button"
                          className={`py-2 px-1 rounded-xl text-xs font-medium border text-center transition-all cursor-pointer ${
                            isActive
                              ? "bg-[#c29b78]/[0.12] border-[#c29b78] text-[#c29b78]"
                              : "bg-[#12100e] border-white/[0.06] text-[#78716c] hover:border-white/20 hover:text-[#f5f2eb]"
                          }`}
                        >
                          {tier.label}
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
            {/* STATE 2: 'step-goal' (Target Rating Goal Slider)             */}
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

                  {/* Trajectory Hero Card */}
                  <div className="mt-5 p-5 rounded-2xl bg-[#12100e] border border-white/[0.08]">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs font-mono text-[#78716c]">
                        <span>From {startingElo}</span>
                        <span className="text-[#c29b78]">→</span>
                      </div>
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                        +{Math.max(0, targetElo - startingElo)} Elo
                      </span>
                    </div>

                    <div className="flex items-baseline gap-2 mt-2">
                      <span className="text-4xl font-mono font-bold text-[#c29b78]">
                        {targetElo}
                      </span>
                      <span className="text-xs font-mono uppercase text-[#78716c]">Target Elo</span>
                    </div>

                    <p className="text-xs text-[#78716c] mt-2">
                      {targetElo - startingElo < 300
                        ? "Steady, consistent tactical progression"
                        : targetElo - startingElo < 600
                        ? "Focused tactical mastery & pattern elevation"
                        : "Ambitious tournament-grade mastery"}
                    </p>
                  </div>

                  {/* Interactive Target Slider */}
                  <div className="mt-6 px-1">
                    <div className="relative flex items-center">
                      <input
                        type="range"
                        min={Math.min(2500, startingElo + 50)}
                        max={2600}
                        step={25}
                        value={targetElo}
                        onChange={(e) => setTargetElo(Number(e.target.value))}
                        className="w-full h-2 rounded-lg appearance-none cursor-pointer bg-white/[0.08] accent-[#c29b78]
                          [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:h-6 
                          [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#c29b78] 
                          [&::-webkit-slider-thumb]:shadow-[0_0_12px_rgba(194,155,120,0.6)] [&::-webkit-slider-thumb]:border-2 
                          [&::-webkit-slider-thumb]:border-[#0a0908] [&::-webkit-slider-thumb]:cursor-pointer
                          [&::-moz-range-thumb]:w-6 [&::-moz-range-thumb]:h-6 [&::-moz-range-thumb]:rounded-full 
                          [&::-moz-range-thumb]:bg-[#c29b78] [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-[#0a0908]
                          [&::-moz-range-thumb]:cursor-pointer"
                        style={{
                          background: `linear-gradient(to right, #c29b78 0%, #c29b78 ${
                            ((targetElo - Math.min(2500, startingElo + 50)) /
                              (2600 - Math.min(2500, startingElo + 50))) *
                            100
                          }%, rgba(255,255,255,0.08) ${
                            ((targetElo - Math.min(2500, startingElo + 50)) /
                              (2600 - Math.min(2500, startingElo + 50))) *
                            100
                          }%, rgba(255,255,255,0.08) 100%)`,
                        }}
                      />
                    </div>

                    <div className="flex justify-between items-center text-[11px] font-mono text-[#78716c] mt-3">
                      <span>{Math.min(2500, startingElo + 50)}</span>
                      <span className="text-[#a8a29e]">1,800</span>
                      <span>2,600 Max</span>
                    </div>
                  </div>

                  {/* Quick Delta Chips */}
                  <div className="grid grid-cols-4 gap-2 mt-5">
                    {[200, 400, 600, 800].map((delta) => {
                      const value = Math.min(2600, startingElo + delta);
                      const isSelected = targetElo === value;
                      return (
                        <button
                          key={delta}
                          onClick={() => setTargetElo(value)}
                          type="button"
                          className={`py-2 px-1 rounded-xl text-xs font-mono font-medium border text-center transition-all cursor-pointer ${
                            isSelected
                              ? "bg-[#c29b78]/[0.15] border-[#c29b78] text-[#c29b78]"
                              : "bg-[#12100e] border-white/[0.06] text-[#78716c] hover:border-white/20 hover:text-[#f5f2eb]"
                          }`}
                        >
                          +{delta}
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
            {/* STATE 3: 'step-board' (Board Theme 2x3 Grid, No Pieces)      */}
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
                    Select your aesthetic for the puzzle reels feed.
                  </p>

                  {/* 2x3 Grid of Board Options (Pure checkerboards, No pieces) */}
                  <div className="grid grid-cols-2 gap-2.5 sm:gap-3 mt-4">
                    {BOARD_THEMES.map((theme) => {
                      const isSelected = selectedTheme.id === theme.id;
                      return (
                        <button
                          key={theme.id}
                          onClick={() => {
                            setSelectedTheme(theme);
                            setStoredBoardTheme(theme.id);
                          }}
                          type="button"
                          className={`relative p-2.5 sm:p-3 rounded-2xl border transition-all duration-150 flex flex-col items-center gap-2 cursor-pointer ${
                            isSelected
                              ? "bg-[#c29b78]/[0.1] border-[#c29b78] shadow-lg shadow-[#c29b78]/15 ring-1 ring-[#c29b78]"
                              : "bg-[#12100e] border-white/[0.08] hover:border-white/20 hover:bg-[#181512]"
                          }`}
                        >
                          {/* Selected Check Badge */}
                          {isSelected && (
                            <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-[#c29b78] text-[#0a0908] flex items-center justify-center shadow-md">
                              <Check className="w-2.5 h-2.5 stroke-[3]" />
                            </div>
                          )}

                          {/* 4x4 Mini Checkerboard Swatch (Clean, no pieces) */}
                          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden grid grid-cols-4 grid-rows-4 border border-black/40 shadow-inner shrink-0">
                            {[...Array(16)].map((_, idx) => {
                              const r = Math.floor(idx / 4);
                              const c = idx % 4;
                              const isDark = (r + c) % 2 === 1;
                              return (
                                <div
                                  key={idx}
                                  className="w-full h-full"
                                  style={{
                                    backgroundColor: isDark ? theme.dark : theme.light,
                                  }}
                                />
                              );
                            })}
                          </div>

                          {/* Board Name Underneath */}
                          <span
                            className={`text-xs font-medium text-center transition-colors ${
                              isSelected ? "text-[#f5f2eb]" : "text-[#a8a29e]"
                            }`}
                          >
                            {theme.name}
                          </span>
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
            {/* STATE 3: 'auth' (Lock In Profile & Enter Feed)               */}
            {/* ============================================================ */}
            {step === "auth" && (
              <motion.div
                key="auth"
                custom={direction}
                variants={slideVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                className="w-full h-full flex flex-col justify-between overflow-hidden"
              >
                <div className="overflow-hidden flex-1 min-h-0 space-y-2">
                  {pendingGoogleUser ? (
                    <div className="space-y-3">
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
                        <Check className="w-3.5 h-3.5" />
                        <span>Google Account Connected</span>
                      </div>

                      <div>
                        <h2 className="text-lg sm:text-xl font-semibold tracking-tight text-[#f5f2eb]">
                          Ready to swipe, {pendingGoogleUser.name?.split(" ")[0] || "Tactician"}!
                        </h2>
                        <p className="text-xs text-[#78716c] mt-0.5">
                          Your calibration is locked in. Let&apos;s finalize your tactical profile.
                        </p>
                      </div>

                      {/* Profile Summary Card */}
                      <div className="p-3.5 rounded-2xl bg-[#12100e] border border-white/[0.08] space-y-2.5">
                        <div className="flex items-center gap-3">
                          {pendingGoogleUser.avatar && pendingGoogleUser.avatar.startsWith("http") ? (
                            <img
                              src={pendingGoogleUser.avatar}
                              alt={pendingGoogleUser.name}
                              className="w-10 h-10 rounded-xl object-cover border border-white/10"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#c29b78] to-[#967355] flex items-center justify-center text-zinc-950 font-bold text-base">
                              {pendingGoogleUser.name?.charAt(0) || "♟"}
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-bold text-[#f5f2eb] truncate">
                              {pendingGoogleUser.name}
                            </div>
                            <div className="text-xs text-stone-400 truncate font-mono">
                              {pendingGoogleUser.email}
                            </div>
                          </div>
                        </div>

                        {/* Calibration summary pill */}
                        <div className="flex items-center justify-center gap-3 px-3.5 py-2 rounded-xl bg-[#12100e] border border-white/10 text-xs font-medium text-[#f5f2eb]">
                          <span>Starting: {startingElo} Elo</span>
                          <span className="text-white/20">•</span>
                          <span>Target: {targetElo} Elo</span>
                        </div>

                        {/* Tactics Username Input */}
                        <div className="space-y-1">
                          <label className="text-[11px] font-medium text-stone-400">
                            Tactics Username
                          </label>
                          <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 15))}
                            placeholder={pendingGoogleUser.name?.toLowerCase().replace(/[^a-z0-9]/g, "") || "username"}
                            className="w-full h-9 px-3.5 rounded-xl bg-white/[0.03] border border-white/10 focus:border-[#c29b78] text-xs text-[#f5f2eb] font-mono outline-none transition-colors"
                          />
                        </div>
                      </div>

                      {authError && (
                        <div className="text-xs text-rose-400 bg-rose-950/30 border border-rose-800/40 rounded-lg p-2">
                          {authError}
                        </div>
                      )}

                      <button
                        type="button"
                        disabled={isSubmitting}
                        onClick={handleCompleteGoogleOnboarding}
                        className="w-full h-11 rounded-full bg-[#c29b78] hover:bg-[#d4b08f] text-[#0a0908] font-bold text-xs sm:text-sm tracking-wide transition-all duration-150 active:scale-[0.98] shadow-lg shadow-[#c29b78]/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                      >
                        {isSubmitting ? (
                          <div className="w-4 h-4 border-2 border-stone-900 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <>
                            <span>Complete Setup & Start Playing ({startingElo} Elo)</span>
                            <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                          </>
                        )}
                      </button>

                      <div className="text-center pt-0.5">
                        <button
                          type="button"
                          onClick={() => {
                            setPendingGoogleUser(null);
                            document.cookie = "chess_reel_pending_google=; path=/; max-age=0";
                            setAuthMode("signup");
                          }}
                          className="text-[11px] text-[#78716c] hover:text-[#f5f2eb] transition-colors cursor-pointer"
                        >
                          Sign up with password instead
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <h2 className="text-lg sm:text-xl font-semibold tracking-tight text-[#f5f2eb]">
                        {authMode === "signup" ? "Lock in your calibration." : "Welcome back."}
                      </h2>

                      {/* Summary Pill */}
                      {authMode === "signup" && (
                        <div className="mt-2 flex items-center justify-center gap-3 px-3.5 py-2 rounded-xl bg-[#12100e] border border-white/10 text-xs font-medium text-[#f5f2eb]">
                          <span>Starting: {startingElo} Elo</span>
                          <span className="text-white/20">•</span>
                          <span>Target: {targetElo} Elo</span>
                        </div>
                      )}

                      {/* Google OAuth Button */}
                      <div className="mt-2.5">
                        <button
                          onClick={() => handleGoogleAuth(authMode)}
                          type="button"
                          className="w-full h-10 rounded-xl bg-[#12100e] hover:bg-[#1a1714] border border-white/[0.1] hover:border-white/20 text-[#f5f2eb] font-medium text-xs sm:text-sm transition-all duration-150 active:scale-[0.98] flex items-center justify-center gap-2.5 cursor-pointer"
                        >
                          <GoogleLogo />
                          <span>Continue with Google</span>
                        </button>
                      </div>

                      {/* Minimal Hairline Divider */}
                      <div className="flex items-center gap-3 my-2">
                        <div className="flex-1 h-px bg-white/[0.08]" />
                        <span className="text-[10px] uppercase tracking-wider text-[#78716c]">or</span>
                        <div className="flex-1 h-px bg-white/[0.08]" />
                      </div>

                      {/* Credentials Form */}
                      <form onSubmit={handleCredentialsSubmit} noValidate className="space-y-1.5">
                        {authMode === "signup" ? (
                          <>
                            <div>
                              <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Name"
                                autoComplete="name"
                                className="w-full h-8.5 px-3 rounded-lg bg-white/[0.03] border border-white/10 focus:border-[#c29b78] text-xs text-[#f5f2eb] placeholder:text-stone-600 outline-none transition-colors"
                              />
                            </div>

                            <div>
                              <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="Email"
                                autoCapitalize="none"
                                autoComplete="email"
                                className="w-full h-8.5 px-3 rounded-lg bg-white/[0.03] border border-white/10 focus:border-[#c29b78] text-xs text-[#f5f2eb] placeholder:text-stone-600 outline-none transition-colors"
                              />
                            </div>

                            <div>
                              <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                placeholder="Username"
                                autoCapitalize="none"
                                autoComplete="username"
                                className="w-full h-8.5 px-3 rounded-lg bg-white/[0.03] border border-white/10 focus:border-[#c29b78] text-xs text-[#f5f2eb] placeholder:text-stone-600 outline-none transition-colors"
                              />
                            </div>

                            <div>
                              <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Password"
                                autoComplete="new-password"
                                className="w-full h-8.5 px-3 rounded-lg bg-white/[0.03] border border-white/10 focus:border-[#c29b78] text-xs text-[#f5f2eb] placeholder:text-stone-600 outline-none transition-colors"
                              />
                            </div>

                            <div>
                              <input
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="Confirm Pass"
                                autoComplete="new-password"
                                className="w-full h-8.5 px-3 rounded-lg bg-white/[0.03] border border-white/10 focus:border-[#c29b78] text-xs text-[#f5f2eb] placeholder:text-stone-600 outline-none transition-colors"
                              />
                            </div>
                          </>
                        ) : (
                          <>
                            <div>
                              <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                placeholder="Username or email"
                                autoCapitalize="none"
                                autoComplete="username"
                                className="w-full h-9 px-3.5 rounded-xl bg-white/[0.03] border border-white/10 focus:border-[#c29b78] text-xs sm:text-sm text-[#f5f2eb] placeholder:text-stone-600 outline-none transition-colors"
                              />
                            </div>

                            <div>
                              <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Password"
                                autoComplete="current-password"
                                className="w-full h-9 px-3.5 rounded-xl bg-white/[0.03] border border-white/10 focus:border-[#c29b78] text-xs sm:text-sm text-[#f5f2eb] placeholder:text-stone-600 outline-none transition-colors"
                              />
                            </div>
                          </>
                        )}

                        {authError && (
                          <div className="text-xs text-rose-400 bg-rose-950/30 border border-rose-800/40 rounded-lg p-1.5">
                            {authError}
                          </div>
                        )}

                        <button
                          type="submit"
                          disabled={isSubmitting}
                          className="w-full h-10 rounded-xl bg-[#c29b78] hover:bg-[#d4b08f] text-[#0a0908] font-semibold text-xs sm:text-sm tracking-wide transition-all duration-150 active:scale-[0.98] shadow-lg shadow-[#c29b78]/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-1"
                        >
                          {isSubmitting ? (
                            <div className="w-4 h-4 border-2 border-stone-900 border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <span>{authMode === "signup" ? "Create Account" : "Sign In"}</span>
                          )}
                        </button>
                      </form>
                    </div>
                  )}
                </div>

                {/* Bottom Mode Switch */}
                {!pendingGoogleUser && (
                  <div className="w-full pt-2 pb-1 text-center shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        if (authMode === "signin") {
                          goTo("step-elo", 1);
                        } else {
                          setAuthMode("signin");
                          setAuthError(null);
                        }
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
              )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
