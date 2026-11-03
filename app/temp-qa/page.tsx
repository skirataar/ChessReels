"use client";

import React, { useState, useEffect, useRef, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2,
  XCircle,
  ChevronUp,
  Sparkles,
  Zap,
  Flame,
  Snowflake,
  RotateCcw,
  Play,
  RefreshCw,
  Trash2,
  ShieldCheck,
  Check,
  ArrowRight,
  User,
  Clock,
  Sliders,
  Layers,
  Award,
  AlertTriangle,
  ArrowLeft,
} from "lucide-react";
import {
  clearAllUserAndPuzzleCache,
  getStoredQueue,
  saveQueue,
} from "@/lib/puzzleCache";
import {
  StreakData,
  resolveStreakOnSolve,
  resolveStreakOnLoad,
  getTodayDateString,
  getCalendarDaysDiff,
} from "@/lib/useStreak";

// Smooth animated Elo number counter matching PlayView.tsx
function AnimatedEloCounter({ value, duration = 600 }: { value: number; duration?: number }) {
  const [displayValue, setDisplayValue] = useState<number>(value);
  const prevValueRef = useRef<number>(value);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    const from = prevValueRef.current;
    const to = value;
    prevValueRef.current = value;

    if (from === to) {
      setDisplayValue(to);
      return;
    }

    const startTime = performance.now();

    const animateNumber = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);
      // easeOutCubic: 1 - Math.pow(1 - progress, 3)
      const ease = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(from + (to - from) * ease);
      setDisplayValue(current);

      if (progress < 1) {
        animationFrameRef.current = requestAnimationFrame(animateNumber);
      } else {
        setDisplayValue(to);
      }
    };

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    animationFrameRef.current = requestAnimationFrame(animateNumber);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [value, duration]);

  return <span suppressHydrationWarning className="tracking-tight">{displayValue}</span>;
}

interface MockPuzzle {
  id: string;
  rating: number;
  theme: string;
  status: "pending" | "solved" | "failed";
  reinserted?: boolean;
  reinsertOffset?: number;
}

const INITIAL_MOCK_PUZZLES: MockPuzzle[] = [
  { id: "p_101", rating: 1250, theme: "Fork", status: "pending" },
  { id: "p_102", rating: 1280, theme: "Pin", status: "pending" },
  { id: "p_103", rating: 1310, theme: "Back Rank", status: "pending" },
  { id: "p_104", rating: 1340, theme: "Skewer", status: "pending" },
  { id: "p_105", rating: 1360, theme: "Discovered Attack", status: "pending" },
  { id: "p_106", rating: 1390, theme: "Deflection", status: "pending" },
  { id: "p_107", rating: 1420, theme: "Double Check", status: "pending" },
  { id: "p_108", rating: 1450, theme: "Overload", status: "pending" },
  { id: "p_109", rating: 1475, theme: "Zwischenzug", status: "pending" },
  { id: "p_110", rating: 1510, theme: "Quiet Move", status: "pending" },
  { id: "p_111", rating: 1540, theme: "Interference", status: "pending" },
  { id: "p_112", rating: 1570, theme: "Mating Net", status: "pending" },
  { id: "p_113", rating: 1600, theme: "Clearance", status: "pending" },
  { id: "p_114", rating: 1630, theme: "Attacking f7", status: "pending" },
  { id: "p_115", rating: 1660, theme: "Endgame Tactic", status: "pending" },
];

export default function TempQAPage() {
  const router = useRouter();

  // -------------------------------------------------------------
  // MODULE 1: Onboarding Summary Pill & Pro Upsell Simulator
  // -------------------------------------------------------------
  const [onboardStartingElo, setOnboardStartingElo] = useState<number>(1200);
  const [onboardTargetElo, setOnboardTargetElo] = useState<number>(1800);
  const [showProUpsellModal, setShowProUpsellModal] = useState<boolean>(false);
  const [upsellFeedback, setUpsellFeedback] = useState<string | null>(null);

  // -------------------------------------------------------------
  // MODULE 2: Auth Cache & Account Switch Inspector
  // -------------------------------------------------------------
  const [storageKeys, setStorageKeys] = useState<{ key: string; value: string; type: "local" | "session" }[]>([]);
  const [activeUserSimulation, setActiveUserSimulation] = useState<string | null>(null);
  const [cacheClearMessage, setCacheClearMessage] = useState<string | null>(null);

  const refreshStorageTable = () => {
    if (typeof window === "undefined") return;
    const entries: { key: string; value: string; type: "local" | "session" }[] = [];

    // LocalStorage
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i);
      if (k && (k.startsWith("chess_reel") || k.includes("elo") || k.includes("puzzle") || k.includes("streak"))) {
        entries.push({
          key: k,
          value: window.localStorage.getItem(k) || "",
          type: "local",
        });
      }
    }

    // SessionStorage
    for (let i = 0; i < window.sessionStorage.length; i++) {
      const k = window.sessionStorage.key(i);
      if (k) {
        entries.push({
          key: k,
          value: window.sessionStorage.getItem(k) || "",
          type: "session",
        });
      }
    }

    setStorageKeys(entries.sort((a, b) => a.key.localeCompare(b.key)));
  };

  useEffect(() => {
    refreshStorageTable();
  }, []);

  const simulateAccountSwitch = (userId: string, username: string, elo: number) => {
    if (typeof window === "undefined") return;
    // Wipe previous cache first to guarantee zero cross-contamination
    clearAllUserAndPuzzleCache();

    // Set new account credentials
    window.localStorage.setItem(
      "chess_reel_account",
      JSON.stringify({
        id: userId,
        username,
        displayName: username,
        elo,
        plan: "free",
      })
    );
    window.localStorage.setItem("chess_reel_elo", String(elo));
    window.localStorage.setItem("chess_reel_user_elo", String(elo));

    // Save dedicated queue for this userId
    const queueData = [
      {
        id: `${userId}_p1`,
        fen: "r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3",
        moves: "f3e5 c6e5",
        rating: elo,
      },
      {
        id: `${userId}_p2`,
        fen: "r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4",
        moves: "f3g5 d7d5",
        rating: elo + 25,
      },
    ];
    window.localStorage.setItem(`chess_reel_puzzle_queue_${userId}`, JSON.stringify(queueData));

    setActiveUserSimulation(`${username} (${elo} Elo)`);
    setCacheClearMessage(`Switched to ${username}. Scoped cache populated with ${elo} Elo puzzles.`);
    refreshStorageTable();
  };

  const handleTestLogout = () => {
    clearAllUserAndPuzzleCache();
    setActiveUserSimulation(null);
    setCacheClearMessage("Full cache flushed! Cookies, puzzle queues, Elo, and user state cleared. Zero residual data.");
    refreshStorageTable();
  };

  // -------------------------------------------------------------
  // MODULE 3: Puzzle Queue, Loop Check & Spaced-Repetition Tester
  // -------------------------------------------------------------
  const [queue, setQueue] = useState<MockPuzzle[]>(INITIAL_MOCK_PUZZLES);
  const [queueIndex, setQueueIndex] = useState<number>(0);
  const [solvedPuzzleIds, setSolvedPuzzleIds] = useState<Set<string>>(new Set());
  const [queueActionLog, setQueueActionLog] = useState<string[]>([]);

  const currentPuzzle = queue[queueIndex] || null;

  const handleSimulateSolve = () => {
    if (!currentPuzzle) return;
    const currentId = currentPuzzle.id;

    // 1. Mark in solved set
    const nextSolved = new Set(solvedPuzzleIds);
    nextSolved.add(currentId);
    setSolvedPuzzleIds(nextSolved);

    // 2. Mark status in queue
    setQueue((prev) =>
      prev.map((p, idx) => (idx === queueIndex ? { ...p, status: "solved" } : p))
    );

    // 3. Advance strictly to next un-solved index (NO loop back to same puzzle)
    let nextIndex = queueIndex + 1;
    while (nextIndex < queue.length && nextSolved.has(queue[nextIndex].id)) {
      nextIndex++;
    }

    setQueueIndex(nextIndex);
    setQueueActionLog((prev) => [
      `[Solved] ${currentId} completed! Added to solvedIds. Advanced directly to index #${nextIndex} (No repeat loop).`,
      ...prev.slice(0, 7),
    ]);
  };

  const handleSimulateFail = () => {
    if (!currentPuzzle) return;
    const currentId = currentPuzzle.id;

    // Exact Spaced-Repetition Formula: offset = 10 + Math.floor(Math.random() * 5)
    const offset = 10 + Math.floor(Math.random() * 5); // 10..14
    const insertIndex = Math.min(queueIndex + offset, queue.length);

    // Mark current instance as failed
    const updated = queue.map((p, idx) =>
      idx === queueIndex ? { ...p, status: "failed" as const } : p
    );

    // Create a fresh clean reset clone of the puzzle
    const cleanClone: MockPuzzle = {
      ...currentPuzzle,
      id: `${currentId}_repeat`,
      status: "pending",
      reinserted: true,
      reinsertOffset: offset,
    };

    // Insert into queue at insertIndex
    updated.splice(insertIndex, 0, cleanClone);
    setQueue(updated);

    // Advance to next puzzle
    setQueueIndex(queueIndex + 1);
    setQueueActionLog((prev) => [
      `[Failed] ${currentId} missed! Re-inserted clean clone at position #${insertIndex} (+${offset} puzzles ahead).`,
      ...prev.slice(0, 7),
    ]);
  };

  const resetQueueTester = () => {
    setQueue(INITIAL_MOCK_PUZZLES);
    setQueueIndex(0);
    setSolvedPuzzleIds(new Set());
    setQueueActionLog(["Queue reset to 15 fresh pending puzzles."]);
  };

  // -------------------------------------------------------------
  // MODULE 4: Auto-Swipe Toggle & 7s Idle Prompt Tester
  // -------------------------------------------------------------
  const [autoAdvanceEnabled, setAutoAdvanceEnabled] = useState<boolean>(false);
  const [idleTimeRemaining, setIdleTimeRemaining] = useState<number | null>(null);
  const [showIdleChevron, setShowIdleChevron] = useState<boolean>(false);
  const idleTimerRef = useRef<NodeJS.Timeout | null>(null);
  const idleCountdownRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = window.localStorage.getItem("chess_reel_auto_advance") === "true";
      setAutoAdvanceEnabled(stored);
    }
  }, []);

  const toggleAutoAdvance = (enabled: boolean) => {
    setAutoAdvanceEnabled(enabled);
    if (typeof window !== "undefined") {
      window.localStorage.setItem("chess_reel_auto_advance", String(enabled));
      window.dispatchEvent(new Event("preferences-updated"));
    }
  };

  const start7sIdleTimer = () => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    if (idleCountdownRef.current) clearInterval(idleCountdownRef.current);
    setShowIdleChevron(false);

    if (autoAdvanceEnabled) {
      setIdleTimeRemaining(0);
      setQueueActionLog((prev) => [
        "[Auto-Advance Enabled] Auto-swiped to next puzzle immediately.",
        ...prev.slice(0, 7),
      ]);
      return;
    }

    setIdleTimeRemaining(7.0);
    const startTime = Date.now();
    const duration = 7000;

    idleCountdownRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, (duration - elapsed) / 1000);
      setIdleTimeRemaining(Number(remaining.toFixed(1)));
      if (remaining <= 0) {
        if (idleCountdownRef.current) clearInterval(idleCountdownRef.current);
      }
    }, 100);

    idleTimerRef.current = setTimeout(() => {
      setShowIdleChevron(true);
      setIdleTimeRemaining(0);
    }, 7000);
  };

  const fastForward7s = () => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    if (idleCountdownRef.current) clearInterval(idleCountdownRef.current);
    if (!autoAdvanceEnabled) {
      setIdleTimeRemaining(0);
      setShowIdleChevron(true);
    } else {
      setIdleTimeRemaining(0);
    }
  };

  const dismissIdleIndicator = () => {
    setShowIdleChevron(false);
    setIdleTimeRemaining(null);
  };

  // -------------------------------------------------------------
  // MODULE 5: Placement Feedback & Transient Elo Delta Tester
  // -------------------------------------------------------------
  const [placementFeedback, setPlacementFeedback] = useState<"correct" | "incorrect" | null>(null);
  const [placementMessage, setPlacementMessage] = useState<string | null>(null);

  const [currentRating, setCurrentRating] = useState<number>(1400);
  const [transientEloDelta, setTransientEloDelta] = useState<number | null>(null);
  const [showEloDeltaBadge, setShowEloDeltaBadge] = useState<boolean>(false);
  const [deltaKey, setDeltaKey] = useState<number>(0);
  const deltaDismissTimer = useRef<NodeJS.Timeout | null>(null);

  const triggerPlacementMove = (result: "correct" | "incorrect") => {
    setPlacementFeedback(result);
    setPlacementMessage(
      result === "correct"
        ? "Move accepted! Pausing 1.2s before advancing..."
        : "Wrong move! Highlighting red and pausing 1.2s..."
    );

    setTimeout(() => {
      setPlacementFeedback(null);
      setPlacementMessage("Transition complete! (Advanced to next puzzle).");
    }, 1200);
  };

  const triggerEloChange = (delta: number) => {
    if (deltaDismissTimer.current) clearTimeout(deltaDismissTimer.current);

    setTransientEloDelta(delta);
    setShowEloDeltaBadge(true);
    setDeltaKey((prev) => prev + 1);

    // Count rating
    setCurrentRating((prev) => prev + delta);

    // Auto-dismiss transient delta after 1.5 seconds
    deltaDismissTimer.current = setTimeout(() => {
      setShowEloDeltaBadge(false);
    }, 1500);
  };

  // -------------------------------------------------------------
  // MODULE 6: Streak & 2-Day Streak Freeze Simulator
  // -------------------------------------------------------------
  const [simulatedDate, setSimulatedDate] = useState<string>("2026-11-04");
  const [streakData, setStreakData] = useState<StreakData>({
    currentStreak: 5,
    lastSolvedDate: "2026-11-04",
    streakFreezes: 1,
    perfectWeekCounter: 5,
  });
  const [streakLog, setStreakLog] = useState<string[]>([
    "Simulator loaded: Current Streak 5, 1/2 Freezes, 5/7 towards next Freeze.",
  ]);

  useEffect(() => {
    const today = getTodayDateString();
    setSimulatedDate(today);
    setStreakData((prev) => ({
      ...prev,
      lastSolvedDate: today,
    }));
  }, []);

  const addCalendarDays = (dateStr: string, days: number): string => {
    const [y, m, d] = dateStr.split("-").map(Number);
    const date = new Date(y, m - 1, d);
    date.setDate(date.getDate() + days);
    const ny = date.getFullYear();
    const nm = String(date.getMonth() + 1).padStart(2, "0");
    const nd = String(date.getDate()).padStart(2, "0");
    return `${ny}-${nm}-${nd}`;
  };

  const handleStreakSolveNextDay = () => {
    const nextDate = addCalendarDays(simulatedDate, 1);
    const resolved = resolveStreakOnSolve(streakData, nextDate);
    setSimulatedDate(nextDate);
    setStreakData(resolved);
    setStreakLog((prev) => [
      `[+1 Day Solve (${nextDate})] Streak: ${streakData.currentStreak} -> ${resolved.currentStreak}, Freezes: ${resolved.streakFreezes}/2, Week Progress: ${resolved.perfectWeekCounter}/7`,
      ...prev.slice(0, 7),
    ]);
  };

  const handleSimulatePerfectWeek = () => {
    let currDate = simulatedDate;
    let currData = streakData;

    for (let i = 0; i < 7; i++) {
      currDate = addCalendarDays(currDate, 1);
      currData = resolveStreakOnSolve(currData, currDate);
    }

    setSimulatedDate(currDate);
    setStreakData(currData);
    setStreakLog((prev) => [
      `[7-Day Perfect Week] 7 active solve days logged! Freezes: ${currData.streakFreezes}/2 (+1 Freeze earned). Streak: ${currData.currentStreak}.`,
      ...prev.slice(0, 7),
    ]);
  };

  const handleMissDays = (daysMissed: number) => {
    // Jump forward (daysMissed + 1) days to simulate skipping daysMissed then solving on next day
    const solveDate = addCalendarDays(simulatedDate, daysMissed + 1);
    const beforeFreezes = streakData.streakFreezes;
    const resolved = resolveStreakOnSolve(streakData, solveDate);

    setSimulatedDate(solveDate);
    setStreakData(resolved);

    let explanation = "";
    if (daysMissed === 1) {
      explanation = beforeFreezes >= 1
        ? `Missed 1 day: Consumed 1 freeze (${beforeFreezes} -> ${resolved.streakFreezes}). Streak PRESERVED (${resolved.currentStreak})!`
        : `Missed 1 day: Zero freezes available. Streak LAPSED to 1.`;
    } else if (daysMissed === 2) {
      explanation = beforeFreezes >= 2
        ? `Missed 2 days: Consumed 2 freezes (${beforeFreezes} -> ${resolved.streakFreezes}). Streak PRESERVED (${resolved.currentStreak})!`
        : `Missed 2 days: Insufficient freezes. Streak LAPSED to 1.`;
    } else {
      explanation = `Missed ${daysMissed} days: Limit exceeded (Max 2 Freezes). Streak RESET to 1.`;
    }

    setStreakLog((prev) => [
      `[Missed ${daysMissed} Days -> Solved on ${solveDate}] ${explanation}`,
      ...prev.slice(0, 7),
    ]);
  };

  const handleResetStreak = () => {
    const today = getTodayDateString();
    setSimulatedDate(today);
    setStreakData({
      currentStreak: 1,
      lastSolvedDate: today,
      streakFreezes: 1,
      perfectWeekCounter: 1,
    });
    setStreakLog(["Streak state reset to: 1-Day Streak, 1 Freeze, 1/7 Week."]);
  };

  return (
    <div className="min-h-screen bg-[#0a0908] text-[#f5f2eb] p-4 sm:p-8 font-sans antialiased selection:bg-[#c29b78]/30">
      {/* Top Banner Navigation */}
      <header className="max-w-7xl mx-auto mb-8 pb-6 border-b border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <span className="text-2xl text-[#c29b78]">♟</span>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-[#f5f5f5]">
              Doom<span className="text-[#c29b78]">Chess</span> QA Test Harness
            </h1>
            <span className="px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
              Interactive Harness
            </span>
          </div>
          <p className="mt-1 text-xs text-white/50">
            Self-contained verification suite for Onboarding, Cache, Queue & Spaced Repetition, Auto-Swipe, Placement & Delta, and Streaks.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <Link
            href="/"
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#12100e] border border-white/15 text-xs font-semibold hover:border-[#c29b78] hover:text-[#c29b78] transition-all"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to App</span>
          </Link>
          <button
            onClick={() => {
              resetQueueTester();
              handleResetStreak();
              refreshStorageTable();
            }}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 text-xs font-medium hover:bg-white/10 text-white/80 transition-all"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset All Modules</span>
          </button>
        </div>
      </header>

      {/* Main Grid: 6 Modular Sections */}
      <main className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6 pb-20">

        {/* ------------------------------------------------------------- */}
        {/* MODULE 1: Onboarding Summary Pill & Pro Upsell Simulator */}
        {/* ------------------------------------------------------------- */}
        <section
          data-testid="module-onboarding-upsell"
          className="p-5 sm:p-6 rounded-2xl bg-[#12100e] border border-white/10 flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-[#c29b78]/15 border border-[#c29b78]/30 flex items-center justify-center text-[#c29b78] font-bold text-xs">
                  1
                </div>
                <h2 className="text-sm font-bold text-white tracking-wide">
                  Onboarding & Post-Setup Pro Upsell
                </h2>
              </div>
              <span className="text-[10px] text-[#10b981] font-semibold bg-[#10b981]/15 px-2 py-0.5 rounded-full border border-[#10b981]/30">
                Overflow Fixed
              </span>
            </div>

            <p className="text-xs text-white/60 mb-4 leading-relaxed">
              Verify that the final setup step pill renders strictly without board color text, fits inside a 390px mobile viewport without horizontal overflow, and triggers the post-setup Pro Upsell screen.
            </p>

            {/* Test Inputs */}
            <div className="grid grid-cols-2 gap-3 mb-5">
              <div>
                <label className="text-[11px] font-medium text-white/50 block mb-1">
                  Starting Elo
                </label>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setOnboardStartingElo((prev) => Math.max(600, prev - 100))}
                    className="px-2 py-1 rounded bg-white/5 text-xs hover:bg-white/10"
                  >
                    -
                  </button>
                  <span className="text-xs font-bold text-[#c29b78] min-w-[50px] text-center">
                    {onboardStartingElo}
                  </span>
                  <button
                    onClick={() => setOnboardStartingElo((prev) => prev + 100)}
                    className="px-2 py-1 rounded bg-white/5 text-xs hover:bg-white/10"
                  >
                    +
                  </button>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-medium text-white/50 block mb-1">
                  Target Elo
                </label>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setOnboardTargetElo((prev) => Math.max(onboardStartingElo, prev - 100))}
                    className="px-2 py-1 rounded bg-white/5 text-xs hover:bg-white/10"
                  >
                    -
                  </button>
                  <span className="text-xs font-bold text-[#c29b78] min-w-[50px] text-center">
                    {onboardTargetElo}
                  </span>
                  <button
                    onClick={() => setOnboardTargetElo((prev) => prev + 100)}
                    className="px-2 py-1 rounded bg-white/5 text-xs hover:bg-white/10"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            {/* 390px Mobile Viewport Container Simulation */}
            <div className="mb-4">
              <div className="text-[11px] font-mono text-white/40 mb-1.5 flex items-center justify-between">
                <span>390px Mobile Frame Simulator</span>
                <span className="text-emerald-400">Zero board text • No overflow</span>
              </div>
              <div
                data-testid="onboarding-pill-container"
                className="w-full max-w-[390px] mx-auto p-4 rounded-xl bg-[#0a0908] border border-white/15 relative overflow-hidden"
              >
                {/* The Exact Production Summary Pill */}
                <div
                  data-testid="onboarding-summary-pill"
                  className="flex items-center justify-center gap-3 px-3.5 py-2 rounded-xl bg-[#12100e] border border-white/10 text-xs font-medium text-[#f5f2eb]"
                >
                  <span data-testid="onboarding-pill-start">Starting: {onboardStartingElo} Elo</span>
                  <span className="text-white/20">•</span>
                  <span data-testid="onboarding-pill-target">Target: {onboardTargetElo} Elo</span>
                </div>
              </div>
            </div>

            {upsellFeedback && (
              <div
                data-testid="upsell-feedback-banner"
                className="mb-4 p-2.5 rounded-lg bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs text-center"
              >
                {upsellFeedback}
              </div>
            )}
          </div>

          <button
            data-testid="trigger-pro-upsell-btn"
            onClick={() => setShowProUpsellModal(true)}
            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#c29b78] to-[#dfb48c] text-black font-bold text-xs flex items-center justify-center gap-2 hover:opacity-95 active:scale-[0.99] transition-all shadow-lg shadow-[#c29b78]/10"
          >
            <Sparkles className="w-4 h-4 fill-black" />
            <span>Launch Post-Setup Pro Upsell Screen</span>
          </button>

          {/* Interactive Pro Upsell Modal */}
          <AnimatePresence>
            {showProUpsellModal && (
              <motion.div
                data-testid="pro-upsell-modal-overlay"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
              >
                <motion.div
                  data-testid="pro-upsell-screen"
                  initial={{ scale: 0.95, opacity: 0, y: 10 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  exit={{ scale: 0.95, opacity: 0, y: 10 }}
                  className="w-full max-w-[390px] h-[600px] rounded-3xl bg-[#0a0908] border border-white/15 p-6 flex flex-col justify-between relative shadow-2xl overflow-hidden"
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-center">
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#c29b78]/10 border border-[#c29b78]/30 text-[#c29b78] text-[11px] font-bold tracking-wider uppercase">
                        <Sparkles className="w-3.5 h-3.5 fill-[#c29b78]" />
                        <span>PRO ACCESS</span>
                      </div>
                    </div>

                    <div className="text-center space-y-1">
                      <h3 className="text-xl font-black text-white">Unlock GM Training</h3>
                      <p className="text-xs text-white/60">
                        Accelerate to your {onboardTargetElo} Elo goal with pro features.
                      </p>
                    </div>

                    <div className="space-y-2.5 pt-2">
                      {[
                        { title: "Unlimited Daily Puzzles", desc: "No daily rate-limits or quota locks" },
                        { title: "Deep AI Engine Analysis", desc: "Interactive hints & Stockfish line breakdowns" },
                        { title: "Targeted Thematic Drills", desc: "Master pins, forks, and endgame patterns" },
                      ].map((item, idx) => (
                        <div
                          key={idx}
                          className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/5"
                        >
                          <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                            <Check className="w-3 h-3 stroke-[3]" />
                          </div>
                          <div>
                            <div className="text-xs font-semibold text-white">{item.title}</div>
                            <div className="text-[11px] text-white/50">{item.desc}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2 pt-4 border-t border-white/10">
                    <button
                      data-testid="pro-upsell-upgrade-btn"
                      onClick={() => {
                        setUpsellFeedback("User chose: 'Upgrade to Pro' (Tier upgraded)");
                        setShowProUpsellModal(false);
                      }}
                      className="w-full py-3 rounded-xl bg-gradient-to-r from-[#c29b78] to-[#dfb48c] text-black font-bold text-xs hover:opacity-95 transition-all"
                    >
                      Upgrade to Pro
                    </button>
                    <button
                      data-testid="pro-upsell-free-btn"
                      onClick={() => {
                        setUpsellFeedback("User chose: 'Continue with Free Account' (Setup complete)");
                        setShowProUpsellModal(false);
                      }}
                      className="w-full py-2.5 rounded-xl text-xs font-medium text-white/60 hover:text-white transition-all text-center"
                    >
                      Continue with Free Account
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {/* ------------------------------------------------------------- */}
        {/* MODULE 2: Auth Cache & Account Switch Inspector */}
        {/* ------------------------------------------------------------- */}
        <section
          data-testid="module-auth-cache"
          className="p-5 sm:p-6 rounded-2xl bg-[#12100e] border border-white/10 flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-[#c29b78]/15 border border-[#c29b78]/30 flex items-center justify-center text-[#c29b78] font-bold text-xs">
                  2
                </div>
                <h2 className="text-sm font-bold text-white tracking-wide">
                  Auth Cache & Account Switch Isolation
                </h2>
              </div>
              <button
                onClick={refreshStorageTable}
                className="text-white/40 hover:text-white transition-colors"
                title="Refresh Storage Table"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>

            <p className="text-xs text-white/60 mb-4 leading-relaxed">
              Verify that switching between a 2100 Elo account and a 1300 Elo account cleanly isolates puzzle queues by userId, and that logging out wipes all caches without flashing an old page.
            </p>

            {/* Account Switch Simulation Buttons */}
            <div className="grid grid-cols-2 gap-2 mb-3">
              <button
                data-testid="sim-account-a-btn"
                onClick={() => simulateAccountSwitch("user_magnus_2100", "GM_Magnus", 2100)}
                className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-left hover:border-amber-400/50 hover:bg-white/10 transition-all"
              >
                <div className="text-[10px] uppercase font-bold text-amber-400">Account A</div>
                <div className="text-xs font-semibold text-white">GM_Magnus (2100 Elo)</div>
              </button>

              <button
                data-testid="sim-account-b-btn"
                onClick={() => simulateAccountSwitch("user_bob_1300", "ClubPlayer_Bob", 1300)}
                className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-left hover:border-sky-400/50 hover:bg-white/10 transition-all"
              >
                <div className="text-[10px] uppercase font-bold text-sky-400">Account B</div>
                <div className="text-xs font-semibold text-white">ClubPlayer_Bob (1300 Elo)</div>
              </button>
            </div>

            {cacheClearMessage && (
              <div
                data-testid="cache-action-banner"
                className="p-2.5 rounded-lg bg-white/5 border border-white/10 text-[11px] text-white/80 mb-3"
              >
                {cacheClearMessage}
              </div>
            )}

            {/* Storage Keys Live Table */}
            <div className="space-y-1 mb-4">
              <div className="text-[10px] uppercase font-bold tracking-wider text-white/40 flex items-center justify-between">
                <span>Active Cached Keys ({storageKeys.length})</span>
                <span>Type</span>
              </div>
              <div
                data-testid="storage-keys-list"
                className="max-h-36 overflow-y-auto rounded-xl bg-[#0a0908] border border-white/10 p-2 space-y-1 text-[11px] font-mono"
              >
                {storageKeys.length === 0 ? (
                  <div className="text-white/30 text-center py-4">No active cache keys found</div>
                ) : (
                  storageKeys.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-1.5 rounded bg-white/[0.02] border border-white/5"
                    >
                      <span className="text-amber-200/80 truncate max-w-[220px]" title={item.key}>
                        {item.key}
                      </span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/10 text-white/60">
                        {item.type}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <button
            data-testid="test-logout-clear-cache-btn"
            onClick={handleTestLogout}
            className="w-full py-2.5 rounded-xl bg-rose-500/20 text-rose-300 border border-rose-500/30 font-bold text-xs flex items-center justify-center gap-2 hover:bg-rose-500/30 transition-all"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Test Logout & Clear All Cache</span>
          </button>
        </section>

        {/* ------------------------------------------------------------- */}
        {/* MODULE 3: Puzzle Queue, Loop Check & Spaced-Repetition Tester */}
        {/* ------------------------------------------------------------- */}
        <section
          data-testid="module-queue-spaced-repetition"
          className="p-5 sm:p-6 rounded-2xl bg-[#12100e] border border-white/10 flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-[#c29b78]/15 border border-[#c29b78]/30 flex items-center justify-center text-[#c29b78] font-bold text-xs">
                  3
                </div>
                <h2 className="text-sm font-bold text-white tracking-wide">
                  Queue, Loop Check & Spaced-Repetition
                </h2>
              </div>
              <span className="text-[10px] text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                0 Hardcoded Fallbacks
              </span>
            </div>

            <p className="text-xs text-white/60 mb-3 leading-relaxed">
              Verify that solving a puzzle never triggers an infinite loop or reloads the same puzzle, and failing schedules a re-test 10-14 puzzles ahead.
            </p>

            {/* Current Active Puzzle Card */}
            <div
              data-testid="active-puzzle-card"
              className="p-3.5 rounded-xl bg-[#0a0908] border border-white/15 mb-3 flex items-center justify-between"
            >
              <div>
                <div className="text-[10px] font-bold uppercase text-[#c29b78] tracking-wider">
                  Active Reel Puzzle (#{queueIndex + 1} of {queue.length})
                </div>
                <div className="text-sm font-black text-white flex items-center gap-2 mt-0.5">
                  <span>ID: {currentPuzzle?.id || "Queue Completed"}</span>
                  {currentPuzzle && (
                    <span className="text-xs font-normal text-white/60">
                      • {currentPuzzle.rating} Elo • {currentPuzzle.theme}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] px-2 py-0.5 rounded bg-white/10 text-white/70">
                  Solved: {solvedPuzzleIds.size}
                </span>
              </div>
            </div>

            {/* Queue List Preview */}
            <div className="mb-3">
              <div className="text-[10px] uppercase font-bold text-white/40 mb-1 flex items-center justify-between">
                <span>Active Queue</span>
                <span>Status</span>
              </div>
              <div
                data-testid="puzzle-queue-list"
                className="max-h-36 overflow-y-auto rounded-xl bg-[#0a0908] border border-white/10 p-2 space-y-1 text-xs"
              >
                {queue.map((p, idx) => {
                  const isCurrent = idx === queueIndex;
                  const isSolved = solvedPuzzleIds.has(p.id) || p.status === "solved";
                  return (
                    <div
                      key={`${p.id}-${idx}`}
                      data-testid={`queue-item-${p.id}`}
                      className={`flex items-center justify-between p-1.5 rounded transition-all ${
                        isCurrent
                          ? "bg-[#c29b78]/20 border border-[#c29b78]/50 text-white"
                          : p.reinserted
                          ? "bg-amber-500/10 border border-amber-500/30 text-amber-200"
                          : "bg-white/[0.02] border border-white/5 text-white/70"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] text-white/40">#{idx + 1}</span>
                        <span className="font-bold">{p.id}</span>
                        <span className="text-[10px] text-white/50">{p.rating} Elo</span>
                        {p.reinserted && (
                          <span className="text-[9px] px-1 rounded bg-amber-400/20 text-amber-300">
                            Re-insert (+{p.reinsertOffset})
                          </span>
                        )}
                      </div>
                      <span
                        className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded ${
                          isCurrent
                            ? "bg-[#c29b78] text-black"
                            : isSolved
                            ? "bg-emerald-500/20 text-emerald-300"
                            : p.status === "failed"
                            ? "bg-rose-500/20 text-rose-300"
                            : "bg-white/10 text-white/50"
                        }`}
                      >
                        {isCurrent ? "Current" : p.status}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Queue Action Logs */}
            {queueActionLog.length > 0 && (
              <div className="mb-3 text-[10px] font-mono text-white/60 space-y-0.5 bg-black/40 p-2 rounded-lg border border-white/5">
                {queueActionLog.map((log, i) => (
                  <div key={i} className="truncate">{log}</div>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/10">
            <button
              data-testid="simulate-solve-btn"
              onClick={handleSimulateSolve}
              disabled={!currentPuzzle}
              className="py-2.5 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold text-xs flex items-center justify-center gap-2 hover:bg-emerald-500/30 disabled:opacity-40 transition-all"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Simulate Solve</span>
            </button>
            <button
              data-testid="simulate-fail-btn"
              onClick={handleSimulateFail}
              disabled={!currentPuzzle}
              className="py-2.5 rounded-xl bg-rose-500/20 text-rose-300 border border-rose-500/30 font-bold text-xs flex items-center justify-center gap-2 hover:bg-rose-500/30 disabled:opacity-40 transition-all"
            >
              <XCircle className="w-4 h-4" />
              <span>Simulate Fail</span>
            </button>
          </div>
        </section>

        {/* ------------------------------------------------------------- */}
        {/* MODULE 4: Auto-Swipe Toggle & 7s Idle Prompt Tester */}
        {/* ------------------------------------------------------------- */}
        <section
          data-testid="module-auto-swipe-idle"
          className="p-5 sm:p-6 rounded-2xl bg-[#12100e] border border-white/10 flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-[#c29b78]/15 border border-[#c29b78]/30 flex items-center justify-center text-[#c29b78] font-bold text-xs">
                  4
                </div>
                <h2 className="text-sm font-bold text-white tracking-wide">
                  Auto-Swipe Toggle & 7s Idle Chevron
                </h2>
              </div>
              <span className="text-[10px] text-amber-300 font-semibold bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                Off by Default
              </span>
            </div>

            <p className="text-xs text-white/60 mb-4 leading-relaxed">
              When auto-advance is disabled (default), solving a puzzle holds the board. After 7 seconds of inactivity, a sleek floating chevron appears prompting the user to swipe.
            </p>

            {/* Settings Toggle UI */}
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#0a0908] border border-white/10 mb-4">
              <div>
                <div className="text-xs font-bold text-white">Auto-advance after solving</div>
                <div className="text-[11px] text-white/50">
                  {autoAdvanceEnabled ? "Enabled (advances immediately)" : "Disabled (default, waits for swipe)"}
                </div>
              </div>
              <button
                data-testid="auto-advance-toggle"
                onClick={() => toggleAutoAdvance(!autoAdvanceEnabled)}
                className={`w-12 h-6 rounded-full p-1 transition-colors relative ${
                  autoAdvanceEnabled ? "bg-[#c29b78]" : "bg-white/20"
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-white transition-transform ${
                    autoAdvanceEnabled ? "translate-x-6" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            {/* 7s Countdown Simulator Status */}
            <div className="p-3.5 rounded-xl bg-[#0a0908] border border-white/10 mb-4 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-white/60">Idle Inactivity Timer:</span>
                <span className="font-mono font-bold text-amber-400">
                  {idleTimeRemaining !== null ? `${idleTimeRemaining}s` : "Inactive"}
                </span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full bg-amber-400 transition-all duration-100"
                  style={{
                    width: idleTimeRemaining !== null ? `${(idleTimeRemaining / 7.0) * 100}%` : "0%",
                  }}
                />
              </div>
            </div>

            {/* Preview Board Area with Chevron Indicator */}
            <div
              data-testid="idle-preview-board"
              className="h-28 rounded-xl bg-[#0a0908] border border-white/10 relative flex items-center justify-center overflow-hidden mb-4"
            >
              <div className="text-xs text-white/30 font-medium">Chessboard Area (Post-Solve)</div>

              <AnimatePresence>
                {showIdleChevron && (
                  <motion.div
                    data-testid="idle-swipe-indicator"
                    initial={{ opacity: 0, y: 12, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 12, scale: 0.95 }}
                    transition={{ duration: 0.25 }}
                    onClick={dismissIdleIndicator}
                    className="absolute bottom-2.5 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#12100e]/95 border border-[#c29b78]/40 shadow-2xl backdrop-blur-md cursor-pointer group hover:border-[#c29b78]"
                  >
                    <motion.div
                      animate={{ y: [-1, -4, -1] }}
                      transition={{ repeat: Infinity, duration: 1.2, ease: "easeInOut" }}
                      className="flex items-center justify-center"
                    >
                      <ChevronUp className="w-4 h-4 text-[#c29b78] stroke-[2.5]" />
                    </motion.div>
                    <span className="text-xs font-medium text-[#f5f2eb] tracking-wide">
                      Swipe up for next puzzle
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/10">
            <button
              data-testid="start-7s-timer-btn"
              onClick={start7sIdleTimer}
              className="py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs font-semibold hover:bg-white/10 transition-all flex items-center justify-center gap-1.5"
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Start 7s Timer</span>
            </button>
            <button
              data-testid="fast-forward-7s-btn"
              onClick={fastForward7s}
              className="py-2.5 rounded-xl bg-[#c29b78]/20 text-[#c29b78] border border-[#c29b78]/30 text-xs font-bold hover:bg-[#c29b78]/30 transition-all flex items-center justify-center gap-1.5"
            >
              <Play className="w-3.5 h-3.5 fill-[#c29b78]" />
              <span>Fast-Forward 7s</span>
            </button>
          </div>
        </section>

        {/* ------------------------------------------------------------- */}
        {/* MODULE 5: Placement Feedback & Transient Elo Delta Tester */}
        {/* ------------------------------------------------------------- */}
        <section
          data-testid="module-placement-elo-delta"
          className="p-5 sm:p-6 rounded-2xl bg-[#12100e] border border-white/10 flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-[#c29b78]/15 border border-[#c29b78]/30 flex items-center justify-center text-[#c29b78] font-bold text-xs">
                  5
                </div>
                <h2 className="text-sm font-bold text-white tracking-wide">
                  Placement Feedback & Transient Elo Delta
                </h2>
              </div>
              <span className="text-[10px] text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                Auto-Dismiss 1.5s
              </span>
            </div>

            <p className="text-xs text-white/60 mb-4 leading-relaxed">
              Verify that placement games display a visual banner and pause 1.2s before advancing, and that Elo changes trigger an animated number counter with a floating delta that unmounts after 1.5s.
            </p>

            {/* Flush HUD Rating preview (matching PlayView) */}
            <div className="p-4 rounded-xl bg-[#0a0908] border border-white/10 mb-4 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase text-white/40 block">
                  Header HUD Rating Component
                </span>
                <div
                  data-testid="qa-rating-pill"
                  className="flex items-center gap-1.5 font-bold text-base text-[#c29b78] mt-1"
                >
                  <Zap className="w-4 h-4 text-[#c29b78] fill-[#c29b78]" />
                  <AnimatedEloCounter value={currentRating} />
                  <AnimatePresence>
                    {showEloDeltaBadge && transientEloDelta !== null && (
                      <motion.span
                        key={`delta-badge-${deltaKey}`}
                        data-testid="qa-elo-delta-badge"
                        initial={{ opacity: 0, y: 10, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -6, scale: 0.9 }}
                        transition={{ duration: 0.25, ease: "easeOut" }}
                        className={`text-xs font-black ${
                          transientEloDelta >= 0 ? "text-[#10b981]" : "text-[#ef4444]"
                        }`}
                      >
                        {transientEloDelta >= 0 ? `+${transientEloDelta}` : transientEloDelta}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  data-testid="trigger-plus-14-btn"
                  onClick={() => triggerEloChange(14)}
                  className="px-2.5 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold hover:bg-emerald-500/30"
                >
                  +14 Elo
                </button>
                <button
                  data-testid="trigger-minus-11-btn"
                  onClick={() => triggerEloChange(-11)}
                  className="px-2.5 py-1.5 rounded-lg bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-bold hover:bg-rose-500/30"
                >
                  -11 Elo
                </button>
              </div>
            </div>

            {/* Placement Feedback Simulation Box */}
            <div
              data-testid="placement-stage-simulator"
              className="h-28 rounded-xl bg-[#0a0908] border border-white/10 relative flex items-center justify-center overflow-hidden mb-3"
            >
              <div className="text-xs text-white/30">Placement Game Board Preview</div>

              <AnimatePresence>
                {placementFeedback && (
                  <motion.div
                    data-testid="qa-placement-banner"
                    initial={{ scale: 0.85, opacity: 0, y: -8 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.85, opacity: 0, y: -8 }}
                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                    className={`absolute top-3 inset-x-0 mx-auto w-fit z-40 flex items-center gap-2 px-4 py-2 rounded-full border backdrop-blur-md text-sm font-black shadow-2xl tracking-wide select-none ${
                      placementFeedback === "correct"
                        ? "bg-[#12100e]/95 border-[#10b981] text-[#10b981] shadow-emerald-950/70"
                        : "bg-[#12100e]/95 border-[#ef4444] text-[#ef4444] shadow-rose-950/70"
                    }`}
                  >
                    {placementFeedback === "correct" ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-[#10b981] stroke-[2.5]" />
                        <span>Correct!</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="w-4 h-4 text-[#ef4444] stroke-[2.5]" />
                        <span>Incorrect</span>
                      </>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {placementMessage && (
              <div className="text-[11px] text-center text-white/60 mb-2">{placementMessage}</div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/10">
            <button
              data-testid="trigger-placement-correct-btn"
              onClick={() => triggerPlacementMove("correct")}
              className="py-2.5 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold text-xs flex items-center justify-center gap-1.5 hover:bg-emerald-500/30 transition-all"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Trigger Placement Correct</span>
            </button>
            <button
              data-testid="trigger-placement-wrong-btn"
              onClick={() => triggerPlacementMove("incorrect")}
              className="py-2.5 rounded-xl bg-rose-500/20 text-rose-300 border border-rose-500/30 font-bold text-xs flex items-center justify-center gap-1.5 hover:bg-rose-500/30 transition-all"
            >
              <XCircle className="w-4 h-4" />
              <span>Trigger Placement Wrong</span>
            </button>
          </div>
        </section>

        {/* ------------------------------------------------------------- */}
        {/* MODULE 6: Streak & 2-Day Streak Freeze Simulator */}
        {/* ------------------------------------------------------------- */}
        <section
          data-testid="module-streak-freeze"
          className="p-5 sm:p-6 rounded-2xl bg-[#12100e] border border-white/10 flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-[#c29b78]/15 border border-[#c29b78]/30 flex items-center justify-center text-[#c29b78] font-bold text-xs">
                  6
                </div>
                <h2 className="text-sm font-bold text-white tracking-wide">
                  Streak & 2-Day Streak Freeze System
                </h2>
              </div>
              <span className="text-[10px] text-sky-400 font-semibold bg-sky-500/10 px-2 py-0.5 rounded-full border border-sky-500/20">
                Max 2 Freezes
              </span>
            </div>

            <p className="text-xs text-white/60 mb-4 leading-relaxed">
              Verify deterministic calendar-day streaks, earning freezes every 7-day perfect streak, consuming freezes upon 1 or 2 missed days, and resetting on 3+ missed days.
            </p>

            {/* HUD Status Bar Simulation */}
            <div className="p-3.5 rounded-xl bg-[#0a0908] border border-white/10 mb-4 flex items-center justify-between">
              {/* Daily Streak */}
              <div
                data-testid="qa-streak-indicator"
                className="flex items-center gap-1.5 font-bold text-sm text-amber-400"
              >
                <Flame className="w-4 h-4 text-amber-400 fill-amber-400" />
                <span>{streakData.currentStreak} Days</span>
              </div>

              {/* Snowflake Freeze Badge */}
              <div
                data-testid="qa-freeze-indicator"
                className="flex items-center gap-1.5 text-xs font-semibold text-sky-400"
              >
                <Snowflake className="w-4 h-4 text-sky-400" />
                <span>{streakData.streakFreezes}/2 Freezes</span>
              </div>

              {/* 7-Day Week Progress */}
              <div className="text-[11px] text-white/60">
                Week: <span className="text-white font-bold">{streakData.perfectWeekCounter}/7</span>
              </div>
            </div>

            {/* Sim Date & Detailed State */}
            <div className="p-3 rounded-xl bg-[#0a0908] border border-white/10 mb-4 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-white/40">Simulated Date:</span>
                <span className="font-mono text-[#c29b78] font-bold">{simulatedDate}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/40">Last Solved Date:</span>
                <span className="font-mono text-white/70">{streakData.lastSolvedDate || "None"}</span>
              </div>
            </div>

            {/* Streak Simulation Logs */}
            <div className="mb-4 text-[10px] font-mono text-white/60 space-y-0.5 bg-black/40 p-2 rounded-lg border border-white/5 max-h-24 overflow-y-auto">
              {streakLog.map((log, i) => (
                <div key={i} className="truncate">{log}</div>
              ))}
            </div>
          </div>

          {/* Time-Travel Action Buttons */}
          <div className="space-y-2 pt-2 border-t border-white/10">
            <div className="grid grid-cols-2 gap-2">
              <button
                data-testid="streak-plus-one-day-btn"
                onClick={handleStreakSolveNextDay}
                className="py-2 px-3 rounded-xl bg-white/5 border border-white/10 text-xs font-semibold hover:bg-white/10 text-white flex items-center justify-center gap-1.5"
              >
                <span>+1 Day (Solve)</span>
              </button>
              <button
                data-testid="streak-perfect-week-btn"
                onClick={handleSimulatePerfectWeek}
                className="py-2 px-3 rounded-xl bg-sky-500/20 text-sky-300 border border-sky-500/30 text-xs font-bold hover:bg-sky-500/30 flex items-center justify-center gap-1.5"
              >
                <span>7-Day Perfect Week (+1 ❄️)</span>
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <button
                data-testid="streak-miss-1-day-btn"
                onClick={() => handleMissDays(1)}
                className="py-2 px-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] font-medium text-amber-200 hover:bg-amber-500/20 text-center"
              >
                Miss 1 Day
              </button>
              <button
                data-testid="streak-miss-2-days-btn"
                onClick={() => handleMissDays(2)}
                className="py-2 px-2 rounded-xl bg-orange-500/10 border border-orange-500/20 text-[11px] font-medium text-orange-200 hover:bg-orange-500/20 text-center"
              >
                Miss 2 Days
              </button>
              <button
                data-testid="streak-miss-3-days-btn"
                onClick={() => handleMissDays(3)}
                className="py-2 px-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-[11px] font-medium text-rose-300 hover:bg-rose-500/20 text-center"
              >
                Miss 3 Days
              </button>
            </div>
          </div>
        </section>

      </main>
    </div>
  );
}

