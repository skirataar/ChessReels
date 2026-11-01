"use client";

import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useSyncExternalStore,
} from "react";
import {
  PuzzleCard,
  PuzzleData,
  PuzzleStatus,
} from "@/components/PuzzleCard";
import { LeaderboardModal } from "@/components/LeaderboardModal";
import { ProfileModal } from "@/components/ProfileModal";
import { AuthModal } from "@/components/AuthModal";
import { LandingPage } from "@/components/LandingPage";
import { CalibrationCompleteModal } from "@/components/CalibrationCompleteModal";
import { StatsModal } from "@/components/StatsModal";
import { popNextPuzzle, prefetchPuzzles } from "@/lib/puzzleCache";
import { useStreak } from "@/lib/useStreak";
import { RefreshCw, WifiOff, UserPlus, BarChart2 } from "lucide-react";
import { motion } from "framer-motion";

const GUEST_ID_KEY = "chess_reel_guest_id";
const ELO_STORAGE_KEY = "chess_reel_elo";
const ACCOUNT_STORAGE_KEY = "chess_reel_account";

export interface UserAccount {
  id: string;
  username: string;
  displayName?: string;
  avatar?: string;
  elo: number;
  isCalibrated: boolean;
  calibrationStep: number;
}

// Curated fallbacks in case the database is empty or offline with empty cache
const FALLBACK_PUZZLES: PuzzleData[] = [
  {
    id: "00008",
    fen: "r6k/pp2r2p/4Rp1Q/3p4/8/1N1P2R1/P1P2bPP/7K b - - 0 24",
    moves: "f2g3 e6e7",
    rating: 800,
    ratingDeviation: 75,
    popularity: 94,
    nbPlays: 40,
    themes: "crushing hangingPiece middlegame",
    gameUrl: "https://lichess.org/78aSDYey/black#48",
    openingTags: "Sicilian Defense",
  },
  {
    id: "0000d",
    fen: "5rk1/1p3ppp/pq3b2/8/8/1P1Q1N2/P4PPP/3R2K1 w - - 2 27",
    moves: "d3d6 f8d8 d6d8 f6d8",
    rating: 850,
    ratingDeviation: 73,
    popularity: 96,
    nbPlays: 73,
    themes: "advantage endgame short pin",
    gameUrl: "https://lichess.org/F8M8OS71#53",
    openingTags: "Queen's Gambit Declined",
  },
];

function subscribeToOnline(callback: () => void) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);
  return () => {
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
  };
}

function getOnlineSnapshot() {
  return typeof navigator !== "undefined" ? navigator.onLine : true;
}

function getOnlineServerSnapshot() {
  return true;
}

export default function Home() {
  const [guestId, setGuestId] = useState<string>("guest-user");
  const [currentElo, setCurrentElo] = useState<number>(800);
  const [lastEloChange, setLastEloChange] = useState<number | null>(null);
  const [currentPuzzle, setCurrentPuzzle] = useState<PuzzleData | null>(null);
  const [puzzleStatus, setPuzzleStatus] = useState<PuzzleStatus>("loading");
  const [streak, setStreak] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<"reels" | "rank" | "profile">("reels");

  // Account, Friends & Placement Calibration States
  const [userAccount, setUserAccount] = useState<UserAccount | null>(null);
  const [showLanding, setShowLanding] = useState<boolean>(false);
  const [authModalTab, setAuthModalTab] = useState<"register" | "login">("register");
  const [authModalGoogle, setAuthModalGoogle] = useState<boolean>(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [isCalibratedModalOpen, setIsCalibratedModalOpen] = useState<boolean>(false);
  const [calibratedFinalElo, setCalibratedFinalElo] = useState<number>(800);
  const [isStatsModalOpen, setIsStatsModalOpen] = useState<boolean>(false);

  // Daily streak & puzzle totals tracking
  const { dailyStreak, totalSolved, totalFailed, recordPuzzlePlay } = useStreak();

  const fallbackIndexRef = useRef<number>(0);
  const currentEloRef = useRef<number>(currentElo);

  useEffect(() => {
    currentEloRef.current = currentElo;
  }, [currentElo]);

  // Calibration placement status
  const isCalibrating = Boolean(userAccount && !userAccount.isCalibrated);
  const currentCalibrationStep = isCalibrating
    ? Math.min(6, (userAccount?.calibrationStep ?? 0) + 1)
    : 0;

  // Idiomatic React 19 subscription to online status via useSyncExternalStore
  const isOnline = useSyncExternalStore(
    subscribeToOnline,
    getOnlineSnapshot,
    getOnlineServerSnapshot
  );

  // Initialize persistent guest ID, saved account, and saved Elo from localStorage asynchronously
  useEffect(() => {
    const timer = setTimeout(() => {
      if (typeof window === "undefined") return;

      try {
        // 1. Guest ID
        let savedGuestId = window.localStorage.getItem(GUEST_ID_KEY);
        if (!savedGuestId) {
          savedGuestId =
            typeof crypto !== "undefined" && crypto.randomUUID
              ? crypto.randomUUID()
              : `guest-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
          window.localStorage.setItem(GUEST_ID_KEY, savedGuestId);
        }
        setGuestId(savedGuestId);

        // 2. Saved Account
        const savedAccountRaw = window.localStorage.getItem(ACCOUNT_STORAGE_KEY);
        if (savedAccountRaw) {
          try {
            const parsed = JSON.parse(savedAccountRaw);
            if (parsed && parsed.id) {
              setUserAccount(parsed);
              if (parsed.elo) {
                setCurrentElo(parsed.elo);
              }
              // Sync fresh profile from server in background
              fetch(`/api/user/account?userId=${encodeURIComponent(parsed.id)}`)
                .then((res) => (res.ok ? res.json() : null))
                .then((data) => {
                  if (data?.user) {
                    setUserAccount(data.user);
                    if (data.user.elo) setCurrentElo(data.user.elo);
                    window.localStorage.setItem(
                      ACCOUNT_STORAGE_KEY,
                      JSON.stringify(data.user)
                    );
                  }
                })
                .catch(() => {});
            }
          } catch {}
        } else {
          // 3. Saved Elo for Guest
          const savedElo = window.localStorage.getItem(ELO_STORAGE_KEY);
          if (savedElo) {
            const parsedElo = Number.parseInt(savedElo, 10);
            if (!Number.isNaN(parsedElo) && parsedElo > 0) {
              setCurrentElo(parsedElo);
            }
          }
          // If no account and haven't chosen to preview as guest yet, show Landing Page
          const hasPreviewed = window.localStorage.getItem("chess_reel_preview_guest");
          if (!hasPreviewed) {
            setShowLanding(true);
          }
        }
      } catch (e) {
        console.warn("Storage access restricted:", e);
      }
    }, 0);

    return () => clearTimeout(timer);
  }, []);

  // Fetch next puzzle: checks local buffer queue first, falls back to API.
  const fetchNextPuzzle = useCallback(async () => {
    setPuzzleStatus("loading");
    const elo = currentEloRef.current;
    const targetUserId = userAccount?.id || guestId;

    // 1. Check local prefetch queue (Offline buffer)
    const cachedPuzzle = popNextPuzzle();
    if (cachedPuzzle) {
      setCurrentPuzzle(cachedPuzzle);
      // Trigger background buffer replenishment with anti-repetition tracking
      prefetchPuzzles(elo, 5, targetUserId).catch(() => {});
      return;
    }

    // 2. If queue is empty, fetch directly from API
    try {
      const userParam = targetUserId ? `&userId=${encodeURIComponent(targetUserId)}` : "";
      const res = await fetch(`/api/puzzle/random?elo=${elo}${userParam}`);
      if (res.ok) {
        const data = (await res.json()) as PuzzleData;
        setCurrentPuzzle(data);
        prefetchPuzzles(elo, 5, targetUserId).catch(() => {});
      } else {
        console.warn("No puzzle returned from API, using curated fallback.");
        const fallback =
          FALLBACK_PUZZLES[fallbackIndexRef.current % FALLBACK_PUZZLES.length];
        fallbackIndexRef.current += 1;
        setCurrentPuzzle(fallback);
      }
    } catch (err) {
      console.error("Failed to fetch next puzzle from API:", err);
      const fallback =
        FALLBACK_PUZZLES[fallbackIndexRef.current % FALLBACK_PUZZLES.length];
      fallbackIndexRef.current += 1;
      setCurrentPuzzle(fallback);
    }
  }, [userAccount?.id, guestId]);

  // Initial puzzle fetch on mount only
  const initialFetchDoneRef = useRef(false);
  useEffect(() => {
    if (!initialFetchDoneRef.current) {
      initialFetchDoneRef.current = true;
      fetchNextPuzzle();
      prefetchPuzzles(currentEloRef.current, 5, userAccount?.id || guestId).catch(() => {});
    }
  }, [fetchNextPuzzle, userAccount?.id, guestId]);

  // Handle Elo update and placement test logic
  const handleEloUpdate = (newElo: number, change: number) => {
    // Record puzzle result for daily streak tracking and total statistics
    recordPuzzlePlay(change > 0 ? "win" : "loss");

    // -------------------------------------------------------------
    // Calibration Placement Mode: 6 Puzzles to calibrate baseline Elo
    // -------------------------------------------------------------
    if (userAccount && !userAccount.isCalibrated) {
      const calibrationDeltas = [250, 200, 180, 150, 120, 100];
      const stepIndex = userAccount.calibrationStep ?? 0;
      const isWin = change > 0;
      const stepDelta = isWin
        ? calibrationDeltas[stepIndex] || 100
        : -Math.round((calibrationDeltas[stepIndex] || 100) * 0.7);

      const nextElo = Math.max(400, Math.min(2600, currentElo + stepDelta));
      const nextStep = stepIndex + 1;

      setCurrentElo(nextElo);
      setLastEloChange(stepDelta);

      if (nextStep >= 6) {
        // Calibration finished! Finalize placement in database
        fetch("/api/user/calibrate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: userAccount.id,
            finalElo: nextElo,
            isFinished: true,
          }),
        }).catch(() => {});

        const updatedAcc: UserAccount = {
          ...userAccount,
          elo: nextElo,
          isCalibrated: true,
          calibrationStep: 6,
        };
        setUserAccount(updatedAcc);
        setCalibratedFinalElo(nextElo);
        setIsCalibratedModalOpen(true);

        try {
          if (typeof window !== "undefined") {
            window.localStorage.setItem(ACCOUNT_STORAGE_KEY, JSON.stringify(updatedAcc));
            window.localStorage.setItem(ELO_STORAGE_KEY, nextElo.toString());
          }
        } catch {}
      } else {
        // Advance to next calibration step
        fetch("/api/user/calibrate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: userAccount.id,
            step: nextStep,
            finalElo: nextElo,
          }),
        }).catch(() => {});

        const updatedAcc: UserAccount = {
          ...userAccount,
          elo: nextElo,
          calibrationStep: nextStep,
        };
        setUserAccount(updatedAcc);

        try {
          if (typeof window !== "undefined") {
            window.localStorage.setItem(ACCOUNT_STORAGE_KEY, JSON.stringify(updatedAcc));
            window.localStorage.setItem(ELO_STORAGE_KEY, nextElo.toString());
          }
        } catch {}
      }

      fetchNextPuzzle();
      return;
    }

    // -------------------------------------------------------------
    // Standard Continuous Reel Mode
    // -------------------------------------------------------------
    setCurrentElo(newElo);
    setLastEloChange(change);

    if (change > 0) {
      setStreak((prev) => prev + 1);
    } else if (change < 0) {
      setStreak(0);
    }

    try {
      if (typeof window !== "undefined") {
        window.localStorage.setItem(ELO_STORAGE_KEY, newElo.toString());
        if (userAccount) {
          const updated = { ...userAccount, elo: newElo };
          window.localStorage.setItem(ACCOUNT_STORAGE_KEY, JSON.stringify(updated));
        }
      }
    } catch (e) {
      console.warn("Could not save Elo to localStorage:", e);
    }

    // Prefetch next puzzles for the new rating tier with anti-repetition tracking
    prefetchPuzzles(newElo, 5, userAccount?.id || guestId).catch(() => {});
  };

  // Reset rating back to 800
  const handleResetElo = () => {
    setCurrentElo(800);
    setStreak(0);
    setLastEloChange(null);
    try {
      if (typeof window !== "undefined") {
        window.localStorage.setItem(ELO_STORAGE_KEY, "800");
        if (userAccount) {
          const updated: UserAccount = {
            ...userAccount,
            elo: 800,
            isCalibrated: false,
            calibrationStep: 0,
          };
          setUserAccount(updated);
          window.localStorage.setItem(ACCOUNT_STORAGE_KEY, JSON.stringify(updated));
          fetch("/api/user/calibrate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              userId: userAccount.id,
              step: 0,
              finalElo: 800,
              isFinished: false,
            }),
          }).catch(() => {});
        }
      }
    } catch {}
    fetchNextPuzzle();
  };

  // Handle successful account creation or sign-in
  const handleAccountSuccess = (user: UserAccount) => {
    setUserAccount(user);
    setShowLanding(false);
    setCurrentElo(user.elo || 800);

    try {
      if (typeof window !== "undefined") {
        window.localStorage.setItem(ACCOUNT_STORAGE_KEY, JSON.stringify(user));
        window.localStorage.setItem(ELO_STORAGE_KEY, (user.elo || 800).toString());
      }
    } catch {}

    // Refetch puzzle for calibrated / newly logged in rating
    fetchNextPuzzle();
  };

  // Sign out handler
  const handleSignOut = () => {
    setUserAccount(null);
    setShowLanding(true);
    try {
      if (typeof window !== "undefined") {
        window.localStorage.removeItem(ACCOUNT_STORAGE_KEY);
        window.localStorage.removeItem("chess_reel_preview_guest");
      }
    } catch {}
    setActiveTab("reels");
  };

  if (showLanding) {
    return (
      <>
        <LandingPage
          onContinueWithGoogle={() => {
            setAuthModalTab("register");
            setAuthModalGoogle(true);
            setIsAuthModalOpen(true);
          }}
          onOpenRegister={() => {
            setAuthModalTab("register");
            setAuthModalGoogle(false);
            setIsAuthModalOpen(true);
          }}
          onOpenLogin={() => {
            setAuthModalTab("login");
            setAuthModalGoogle(false);
            setIsAuthModalOpen(true);
          }}
          onPreviewAsGuest={() => {
            setShowLanding(false);
            try {
              if (typeof window !== "undefined") {
                window.localStorage.setItem("chess_reel_preview_guest", "true");
              }
            } catch {}
          }}
        />
        <AuthModal
          key={`${isAuthModalOpen ? "open" : "closed"}-${authModalTab}-${authModalGoogle}`}
          isOpen={isAuthModalOpen}
          onClose={() => setIsAuthModalOpen(false)}
          guestId={guestId}
          initialTab={authModalTab}
          initialShowGoogle={authModalGoogle}
          onAccountSuccess={handleAccountSuccess}
        />
      </>
    );
  }

  return (
    <div className="bg-[#0A0A0A] font-sans text-[#e5e1e4] flex flex-col min-h-screen selection:bg-[#10b981] selection:text-[#002113] overflow-x-hidden w-full">
      {/* 1. Fixed Top Header (from new-ui.md) */}
      <header className="fixed top-0 inset-x-0 z-40 bg-[#0A0A0A]/85 backdrop-blur-xl pt-safe border-b border-white/[0.04]">
        <div className="h-16 px-4 max-w-sm sm:max-w-md mx-auto flex items-center justify-between gap-2">
          {/* Brand Logo & Feed Tag */}
          <button
            onClick={() => setShowLanding(true)}
            className="flex items-center gap-2 hover:opacity-85 transition-opacity cursor-pointer text-left"
            aria-label="View about & landing page"
          >
            <div className="w-8 h-8 rounded-lg bg-[#4edea3]/10 border border-[#4edea3]/25 flex items-center justify-center text-[#4edea3] font-black text-sm shadow-sm">
              {userAccount?.avatar || "♟"}
            </div>
            <span className="font-bold text-base tracking-tight text-[#e5e1e4] hidden xs:inline">
              Chess Reel
            </span>
            <span className="text-[10px] tracking-wider uppercase text-[#bbcabf] font-bold px-1.5 py-0.5 rounded bg-[#2a2a2c]">
              {isCalibrating ? "Placement" : "Feed Reels"}
            </span>
          </button>

          {/* Quick HUD: [Elo Pill] ... [Streak Indicator (🔥 X)] [Stats Button] + Profile / Auth */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* [Elo Pill] */}
            <div
              className="flex items-center gap-1 bg-[#18181B]/95 px-2.5 py-1 rounded-full shadow-[0_1px_8px_rgba(0,0,0,0.4)] border border-white/5"
              title={`Your Rating: ${currentElo}`}
            >
              <span className="sr-only">Your Rating:</span>
              <span className="material-symbols-outlined text-[#4edea3] text-base leading-none">
                bolt
              </span>
              <span className="text-xs font-bold text-[#4edea3] tracking-tight">
                {currentElo}
              </span>
              <span className="text-[9px] uppercase font-bold text-[#bbcabf]">
                Elo
              </span>
            </div>

            {/* [Streak Indicator (🔥 X)] */}
            <div
              data-testid="header-streak-indicator"
              className="flex items-center gap-1 bg-[#18181B]/95 px-2.5 py-1 rounded-full border border-white/5"
              title={`Daily Streak: ${dailyStreak} days`}
            >
              <span className="text-xs leading-none">🔥</span>
              <span className="sr-only">local_fire_department</span>
              <span className="text-xs font-bold text-[#ffb95f]">
                {dailyStreak || streak}
              </span>
            </div>

            {/* [Stats Button] */}
            <button
              onClick={() => setIsStatsModalOpen(true)}
              aria-label="Open stats"
              data-testid="header-stats-btn"
              className="w-8 h-8 rounded-full bg-[#18181B]/95 hover:bg-[#27272a] border border-white/10 flex items-center justify-center text-[#bbcabf] hover:text-[#4edea3] transition-colors cursor-pointer"
              title="Tactical Stats"
            >
              <BarChart2 className="w-4 h-4" />
            </button>

            <div className="w-2 h-2 rounded-full bg-emerald-500/20 flex items-center justify-center">
              <div className="w-1 h-1 rounded-full bg-[#4edea3] animate-pulse" />
            </div>

            {userAccount ? (
              <button
                onClick={() => setActiveTab("profile")}
                className="relative flex items-center justify-center rounded-full w-8 h-8 bg-[#2a2a2c] border border-white/10 hover:border-[#4edea3]/40 transition-colors cursor-pointer text-sm"
                aria-label="Open Profile"
              >
                <span>{userAccount.avatar || "♟"}</span>
              </button>
            ) : (
              <button
                onClick={() => {
                  setAuthModalTab("register");
                  setIsAuthModalOpen(true);
                }}
                className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#4edea3]/20 border border-[#4edea3]/40 text-[#4edea3] text-[11px] font-bold hover:bg-[#4edea3]/30 transition-colors cursor-pointer"
                aria-label="Create account or sign in"
              >
                <UserPlus className="w-3 h-3" />
                <span className="hidden xs:inline">Sign In</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Offline Mode Banner */}
      {!isOnline && (
        <div className="fixed top-18 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-semibold backdrop-blur-md shadow-lg">
          <WifiOff className="w-3.5 h-3.5" />
          <span>Offline Mode (Playing from Cache)</span>
        </div>
      )}

      {/* 2. Main Scrollable Reel Canvas */}
      <main className="flex flex-col relative w-full pt-16 pb-24 bg-[#0A0A0A] min-h-[100dvh] overflow-x-hidden">
        {/* Placement Calibration Banner */}
        {isCalibrating && (
          <div className="w-full max-w-sm mx-auto px-3 mt-2 mb-1 animate-in fade-in duration-200">
            <div className="p-3 rounded-xl bg-gradient-to-r from-[#18181B] to-[#201f21] border border-[#38bdf8]/40 shadow-lg flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#38bdf8] animate-ping" />
                  <span className="text-xs font-black text-[#38bdf8] uppercase tracking-wider">
                    Placement Test • Puzzle {currentCalibrationStep} of 6
                  </span>
                </div>
                <span className="text-[10px] text-[#bbcabf] font-mono">
                  Est: {currentElo} Elo
                </span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-[#2a2a2c] overflow-hidden flex gap-1">
                {Array.from({ length: 6 }).map((_, idx) => (
                  <div
                    key={idx}
                    className={`h-full flex-1 rounded-full transition-all duration-300 ${
                      idx < (userAccount?.calibrationStep ?? 0)
                        ? "bg-[#38bdf8]"
                        : idx === (userAccount?.calibrationStep ?? 0)
                        ? "bg-[#38bdf8]/50 animate-pulse"
                        : "bg-white/10"
                    }`}
                  />
                ))}
              </div>
              <p className="text-[10px] text-[#bbcabf]">
                Solve accurately to balance tactical puzzle difficulty to your skill baseline.
              </p>
            </div>
          </div>
        )}

        {puzzleStatus === "loading" && !currentPuzzle ? (
          <div className="w-full flex-1 flex flex-col justify-between items-center px-4 py-3 max-w-sm mx-auto">
            {/* Top skeleton */}
            <div className="w-full h-12 bg-[#18181B]/80 rounded-xl border border-white/5 animate-pulse" />

            {/* Center chessboard skeleton */}
            <div className="w-full aspect-square bg-[#121214] rounded-xl border border-white/5 animate-pulse my-4 flex flex-col items-center justify-center gap-3 shadow-2xl">
              <RefreshCw className="w-8 h-8 text-[#4edea3] animate-spin" />
              <div className="text-xs text-[#bbcabf] font-semibold tracking-wider uppercase">
                Preparing next reel...
              </div>
            </div>

            {/* Bottom tactical card skeleton */}
            <div className="w-full h-16 bg-[#18181B]/80 rounded-xl border border-white/5 animate-pulse" />
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="w-full flex-1 flex flex-col items-center justify-between"
          >
            <PuzzleCard
              puzzle={currentPuzzle}
              status={puzzleStatus}
              currentElo={currentElo}
              guestId={userAccount?.id || guestId}
              streak={dailyStreak || streak}
              lastEloChange={lastEloChange}
              isCalibration={isCalibrating}
              calibrationStep={currentCalibrationStep}
              onStatusChange={setPuzzleStatus}
              onEloUpdate={handleEloUpdate}
              onNextPuzzle={fetchNextPuzzle}
              onOpenStats={() => setIsStatsModalOpen(true)}
            />
          </motion.div>
        )}
      </main>

      {/* 3. Fixed Bottom Floating Navigation Dock (from new-ui.md) */}
      <nav className="fixed bottom-0 inset-x-0 z-40 pb-safe pointer-events-none">
        <div className="mx-auto max-w-sm px-4 pb-3">
          <div className="pointer-events-auto h-16 rounded-full bg-[rgba(39,39,42,0.85)] backdrop-blur-xl shadow-[0_4px_24px_rgba(0,0,0,0.6)] border border-[#3f3f46]/35 flex items-center justify-around px-2">
            {/* Reels Tab */}
            <button
              onClick={() => setActiveTab("reels")}
              className={`flex flex-col items-center justify-center w-14 h-12 rounded-full transition-all cursor-pointer ${
                activeTab === "reels"
                  ? "text-[#4edea3] bg-[#39393b]/60 shadow-inner"
                  : "text-[#bbcabf] hover:text-[#e5e1e4]"
              }`}
              aria-label="Reels feed"
            >
              <span className="material-symbols-outlined text-2xl">
                play_circle
              </span>
              <span className="text-[10px] font-bold tracking-tight uppercase">
                Reels
              </span>
            </button>

            {/* Rank Tab */}
            <button
              onClick={() => setActiveTab("rank")}
              className={`flex flex-col items-center justify-center w-14 h-12 rounded-full transition-all cursor-pointer ${
                activeTab === "rank"
                  ? "text-[#4edea3] bg-[#39393b]/60 shadow-inner"
                  : "text-[#bbcabf] hover:text-[#e5e1e4]"
              }`}
              aria-label="Leaderboard rank"
            >
              <span className="material-symbols-outlined text-2xl">
                leaderboard
              </span>
              <span className="text-[10px] font-bold tracking-tight uppercase">
                Rank
              </span>
            </button>

            {/* Profile Tab */}
            <button
              onClick={() => setActiveTab("profile")}
              className={`flex flex-col items-center justify-center w-14 h-12 rounded-full transition-all cursor-pointer ${
                activeTab === "profile"
                  ? "text-[#4edea3] bg-[#39393b]/60 shadow-inner"
                  : "text-[#bbcabf] hover:text-[#e5e1e4]"
              }`}
              aria-label="Player profile"
            >
              <span className="material-symbols-outlined text-2xl">
                person
              </span>
              <span className="text-[10px] font-bold tracking-tight uppercase">
                Profile
              </span>
            </button>
          </div>
        </div>
      </nav>

      {/* 4. Modals & Drawers */}
      <LeaderboardModal
        isOpen={activeTab === "rank"}
        onClose={() => setActiveTab("reels")}
        currentElo={currentElo}
        streak={streak}
        guestId={guestId}
        userAccount={userAccount}
        onOpenAuth={() => setIsAuthModalOpen(true)}
      />

      <ProfileModal
        isOpen={activeTab === "profile"}
        onClose={() => setActiveTab("reels")}
        currentElo={currentElo}
        streak={streak}
        guestId={guestId}
        userAccount={userAccount}
        onOpenAuth={() => {
          setAuthModalTab("register");
          setIsAuthModalOpen(true);
        }}
        onOpenLanding={() => setShowLanding(true)}
        onSignOut={handleSignOut}
        onResetElo={handleResetElo}
      />

      <AuthModal
        key={`${isAuthModalOpen ? "open" : "closed"}-${authModalTab}-${authModalGoogle}`}
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        guestId={guestId}
        initialTab={authModalTab}
        initialShowGoogle={authModalGoogle}
        onAccountSuccess={handleAccountSuccess}
      />

      <CalibrationCompleteModal
        isOpen={isCalibratedModalOpen}
        onClose={() => {
          setIsCalibratedModalOpen(false);
          setActiveTab("reels");
        }}
        calibratedElo={calibratedFinalElo}
        username={userAccount?.displayName || userAccount?.username || "Challenger"}
      />

      <StatsModal
        isOpen={isStatsModalOpen}
        onClose={() => setIsStatsModalOpen(false)}
        currentElo={currentElo}
        dailyStreak={dailyStreak}
        totalSolved={totalSolved}
        totalFailed={totalFailed}
      />
    </div>
  );
}
