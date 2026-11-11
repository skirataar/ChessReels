"use client";

import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useSyncExternalStore,
} from "react";
import { useRouter } from "next/navigation";
import {
  PuzzleCard,
  PuzzleData,
  PuzzleStatus,
  SavedPuzzleState,
} from "@/components/PuzzleCard";
import { LeaderboardModal } from "@/components/LeaderboardModal";
import { ProfileModal } from "@/components/ProfileModal";
import { AuthModal } from "@/components/AuthModal";
import { CalibrationCompleteModal } from "@/components/CalibrationCompleteModal";
import { StatsModal } from "@/components/StatsModal";
import { QuotaPaywallModal } from "@/components/QuotaPaywallModal";
import {
  popNextPuzzle,
  prefetchPuzzles,
  getStoredQueue,
  saveQueue,
  clearAllUserAndPuzzleCache,
} from "@/lib/puzzleCache";
import { useStreak, resetStreakStats } from "@/lib/useStreak";
import {
  USER_STATS_CACHE_KEY,
  UserStatsCache,
  getStoredUserStats,
  saveUserStatsSync,
  mergeDbStatsWithLocal,
  getTodayDateString,
} from "@/lib/userStats";
import { hydrateUserSession } from "@/lib/sessionHydration";
import { StreakFlameBadge } from "@/components/StreakFlameBadge";
import { StreakCalendarDropdown } from "@/components/StreakCalendarDropdown";
import { useTierQuota } from "@/lib/useTierQuota";
import { clearGuestLocalSession, isGuestAccount, isGuestUserId } from "@/lib/guestAccount";
import { RefreshCw, WifiOff, UserPlus, BarChart2, Trophy, Zap, Flame, Crown, Sparkles, User, Snowflake, Target, X, ChevronDown, ArrowRight, Infinity as InfinityIcon } from "lucide-react";
import { ReelAdCard } from "@/components/ReelAdCard";
import { RewardedAdModal } from "@/components/RewardedAdModal";
import { motion, AnimatePresence } from "framer-motion";

const GUEST_ID_KEY = "chess_reel_guest_id";
const ELO_STORAGE_KEY = "chess_reel_elo";
const ACCOUNT_STORAGE_KEY = "chess_reel_account";
const SOLVED_STORAGE_KEY = "chess_reel_solved_ids";
const RATED_STORAGE_KEY = "chess_reel_rated_puzzle_ids";
const RATING_HISTORY_STORAGE_KEY = "chess_reel_puzzle_rating_history";
const PUZZLE_STATES_KEY = "chess_reel_puzzle_states";

export type PuzzleRatingState = "solved" | "failed_once" | "redeemed";

export interface UserAccount {
  id: string;
  username: string;
  displayName?: string;
  avatar?: string;
  email?: string;
  googleId?: string;
  elo: number;
  isCalibrated: boolean;
  calibrationStep: number;
  plan?: string;
  isPro?: boolean;
  subscriptionStatus?: string;
  subscriptionPlan?: string | null;
  paymentProvider?: string | null;
  currentPeriodEnd?: string | null;
  peakElo?: number;
  targetElo?: number | null;
  streak?: number;
  bestStreak?: number;
  lastSolvedDate?: string | null;
  streakFreezes?: number;
  perfectWeekCounter?: number;
  isFrozenState?: boolean;
  solvedPuzzleIds?: string[];
  savedPuzzleIds?: string[];
  likedPuzzleIds?: string[];
  autoAdvance?: boolean;
  soundEnabled?: boolean;
  showCoordinates?: boolean;
}

function readRegisteredAccount(): UserAccount | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(ACCOUNT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.id || isGuestAccount(parsed)) return null;
    return parsed as UserAccount;
  } catch {
    return null;
  }
}



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

function ChargeBattery({ remaining, unlimited = false }: { remaining: number; unlimited?: boolean }) {
  const isFull = unlimited || remaining >= 15;
  const fillPercent = unlimited ? 100 : Math.max(0, Math.min(100, Math.round((remaining / 15) * 100)));

  let fillBg = "bg-[#c29b78]";
  if (!unlimited) {
    if (remaining >= 10) {
      fillBg = "bg-[#c29b78]";
    } else if (remaining >= 4) {
      fillBg = "bg-[#f59e0b]";
    } else if (remaining >= 1) {
      fillBg = "bg-[#f43f5e]";
    } else {
      fillBg = "transparent";
    }
  }

  const isZero = !unlimited && remaining <= 0;

  return (
    <div className="flex items-center shrink-0" data-testid="charge-battery-capsule">
      <div
        className={`w-9 h-[18px] rounded-[5px] relative overflow-hidden flex items-center justify-center ${
          isZero ? "border border-rose-500/60 bg-rose-950/20" : "bg-zinc-800/90 border border-white/15"
        }`}
      >
        {/* Dynamic fill layer */}
        <div
          className={`absolute left-0 top-0 bottom-0 transition-all duration-300 ${fillBg}`}
          style={{ width: `${fillPercent}%` }}
        />
        {/* Centered inner readout */}
        {unlimited ? (
          <InfinityIcon
            className="w-4 h-4 text-[#0a0908] relative z-10 shrink-0"
            strokeWidth={2.5}
            aria-hidden="true"
          />
        ) : (
          <span
            className={`relative z-10 font-mono text-[11px] font-black leading-none tracking-tighter ${
              remaining <= 0
                ? "text-rose-400 font-bold"
                : remaining >= 10
                ? "text-[#0a0908]"
                : "text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)]"
            }`}
          >
            {remaining}
          </span>
        )}
      </div>
      {/* Positive terminal nub */}
      <div
        className={`w-[2.5px] h-[7.5px] rounded-r-[2px] transition-colors ${
          isFull ? "bg-[#c29b78]" : isZero ? "bg-rose-500/60" : "bg-zinc-500/80"
        }`}
      />
    </div>
  );
}

function getRechargeParts(resetAt: number, now: number) {
  const totalSeconds = Math.max(0, Math.ceil((resetAt - now) / 1000));
  return {
    hours: Math.floor(totalSeconds / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
  };
}

export function PlayView({
  initialShowLanding = false,
}: {
  initialShowLanding?: boolean;
} = {}) {
  const router = useRouter();
  const [guestId, setGuestId] = useState<string>("");
  const [currentElo, setCurrentElo] = useState<number>(() => {
    return getStoredUserStats().elo;
  });
  const [lastEloChange, setLastEloChange] = useState<number | null>(null);

  // Transient floating Elo delta badge state (slides up, holds, auto-dismisses after 1.5s)
  const [transientEloDelta, setTransientEloDelta] = useState<number | null>(null);
  const [showEloDeltaBadge, setShowEloDeltaBadge] = useState<boolean>(false);
  const eloDeltaTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [deltaAnimationKey, setDeltaAnimationKey] = useState<number>(0);

  const triggerEloDeltaBadge = useCallback((delta: number) => {
    if (delta === 0) return;
    setTransientEloDelta(delta);
    setShowEloDeltaBadge(true);
    setDeltaAnimationKey((k) => k + 1);

    if (eloDeltaTimerRef.current) {
      clearTimeout(eloDeltaTimerRef.current);
    }
    eloDeltaTimerRef.current = setTimeout(() => {
      setShowEloDeltaBadge(false);
    }, 1500);
  }, []);

  useEffect(() => {
    return () => {
      if (eloDeltaTimerRef.current) {
        clearTimeout(eloDeltaTimerRef.current);
      }
    };
  }, []);

  // Spaced-repetition: solved puzzle IDs (persisted so zero-mistake solves never re-appear)
  const [solvedPuzzleIds, setSolvedPuzzleIds] = useState<Set<string>>(() => {
    if (typeof window !== "undefined") {
      try {
        const raw = window.localStorage.getItem(SOLVED_STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) return new Set(parsed);
        }
      } catch {}
    }
    return new Set<string>();
  });

  // Solved puzzle IDs ref to prevent fetch effects from re-running on solve
  const solvedPuzzleIdsRef = useRef<Set<string>>(solvedPuzzleIds);
  useEffect(() => {
    solvedPuzzleIdsRef.current = solvedPuzzleIds;
  }, [solvedPuzzleIds]);

  // Sync solved puzzle IDs to localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(
          SOLVED_STORAGE_KEY,
          JSON.stringify(Array.from(solvedPuzzleIds))
        );
      } catch {}
    }
  }, [solvedPuzzleIds]);

  // Per-puzzle completion state persisted in session state (and synced to solvedPuzzleIds)
  const [puzzleStates, setPuzzleStates] = useState<Record<string, SavedPuzzleState>>(() => {
    if (typeof window !== "undefined") {
      try {
        const raw = window.sessionStorage.getItem(PUZZLE_STATES_KEY);
        if (raw) return JSON.parse(raw);
      } catch {}
    }
    return {};
  });

  const puzzleStatesRef = useRef<Record<string, SavedPuzzleState>>(puzzleStates);
  useEffect(() => {
    puzzleStatesRef.current = puzzleStates;
    if (typeof window !== "undefined") {
      try {
        window.sessionStorage.setItem(PUZZLE_STATES_KEY, JSON.stringify(puzzleStates));
      } catch {}
    }
  }, [puzzleStates]);

  const handleSavePuzzleState = useCallback((puzzleId: string, state: SavedPuzzleState) => {
    if (!puzzleId) return;
    setPuzzleStates((prev) => ({
      ...prev,
      [puzzleId]: state,
    }));
  }, []);

  const countedQuotaPuzzleIdsRef = useRef<Set<string>>(new Set());

  // Strict idempotency guard: ratedPuzzleIds tracking every puzzle.id that has already triggered an Elo or streak calculation
  const [ratedPuzzleIds, setRatedPuzzleIds] = useState<Set<string>>(() => {
    if (typeof window !== "undefined") {
      try {
        const raw = window.localStorage.getItem(RATED_STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) return new Set(parsed);
        }
        const solvedRaw = window.localStorage.getItem(SOLVED_STORAGE_KEY);
        if (solvedRaw) {
          const parsed = JSON.parse(solvedRaw);
          if (Array.isArray(parsed)) return new Set(parsed);
        }
      } catch {}
    }
    return new Set<string>();
  });

  const ratedPuzzleIdsRef = useRef<Set<string>>(ratedPuzzleIds);
  useEffect(() => {
    ratedPuzzleIdsRef.current = ratedPuzzleIds;
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(
          RATED_STORAGE_KEY,
          JSON.stringify(Array.from(ratedPuzzleIds))
        );
      } catch {}
    }
  }, [ratedPuzzleIds]);

  // Puzzle Rating State Machine: Record<puzzleId, 'solved' | 'failed_once' | 'redeemed'>
  const [puzzleRatingHistory, setPuzzleRatingHistory] = useState<Record<string, PuzzleRatingState>>(() => {
    if (typeof window !== "undefined") {
      try {
        const raw = window.localStorage.getItem(RATING_HISTORY_STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && typeof parsed === "object") return parsed;
        }
      } catch {}
    }
    return {};
  });

  const puzzleRatingHistoryRef = useRef<Record<string, PuzzleRatingState>>(puzzleRatingHistory);
  useEffect(() => {
    puzzleRatingHistoryRef.current = puzzleRatingHistory;
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(
          RATING_HISTORY_STORAGE_KEY,
          JSON.stringify(puzzleRatingHistory)
        );
      } catch {}
    }
  }, [puzzleRatingHistory]);

  const updatePuzzleRatingState = useCallback((puzzleId: string, state: PuzzleRatingState) => {
    if (!puzzleId) return;
    const baseId = puzzleId.split("_attempt_")[0];
    puzzleRatingHistoryRef.current = {
      ...puzzleRatingHistoryRef.current,
      [baseId]: state,
    };
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(
          RATING_HISTORY_STORAGE_KEY,
          JSON.stringify(puzzleRatingHistoryRef.current)
        );
      } catch {}
    }
    setPuzzleRatingHistory((prev) => {
      if (prev[baseId] === state) return prev;
      return { ...prev, [baseId]: state };
    });
  }, []);

  const markPuzzleSolved = useCallback((puzzleId: string) => {
    if (!puzzleId) return;
    const baseId = puzzleId.split("_attempt_")[0];
    if (!solvedPuzzleIdsRef.current.has(baseId)) {
      solvedPuzzleIdsRef.current = new Set(solvedPuzzleIdsRef.current).add(baseId);
      if (typeof window !== "undefined") {
        try {
          window.localStorage.setItem(
            SOLVED_STORAGE_KEY,
            JSON.stringify(Array.from(solvedPuzzleIdsRef.current))
          );
        } catch {}
      }
    }
    setSolvedPuzzleIds((prev) => {
      if (prev.has(baseId)) return prev;
      const next = new Set(prev);
      next.add(baseId);
      return next;
    });
  }, []);

  const markPuzzleRated = useCallback((puzzleId: string, ratingState?: PuzzleRatingState) => {
    if (!puzzleId) return;
    setRatedPuzzleIds((prev) => {
      if (prev.has(puzzleId)) return prev;
      const next = new Set(prev);
      next.add(puzzleId);
      return next;
    });

    if (ratingState) {
      updatePuzzleRatingState(puzzleId, ratingState);
    }
  }, [updatePuzzleRatingState]);

  // Deterministic check whether a puzzle is already rated or eligible
  const getIsPuzzleAlreadyRated = useCallback((p: PuzzleData | null | undefined): boolean => {
    if (!p) return false;
    if (p.hasBeenRated) return true;
    const baseId = p.id;
    const ratingState = puzzleRatingHistoryRef.current[baseId];
    if (ratingState === "solved" || ratingState === "redeemed") return true;
    return false;
  }, []);

  // Puzzle feed queue state & active pointer for bi-directional swiping.
  // Initialized to empty array so no hardcoded placeholder puzzles render before real API puzzles arrive.
  const [queue, setQueue] = useState<PuzzleData[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [slideDirection, setSlideDirection] = useState<"next" | "prev">("next");

  // Active puzzle derived from queue and currentIndex
  const currentPuzzle = queue[currentIndex] || null;

  const puzzleAttemptCountRef = useRef<Record<string, number>>({});

  const ensurePuzzleInstanceId = useCallback((p: PuzzleData): PuzzleData => {
    if (!p) return p;
    const attempt = p.attemptCount || puzzleAttemptCountRef.current[p.id] || 1;
    puzzleAttemptCountRef.current[p.id] = attempt;
    return {
      ...p,
      attemptCount: attempt,
      attemptNumber: attempt,
      instanceId: p.instanceId || `${p.id}_attempt_${attempt}`,
      hasBeenRated: p.hasBeenRated ?? false,
    };
  }, []);

  // Track attempt mistakes: tracks IDs that experienced a mistake during their current attempt
  const failedAttemptPuzzleIdsRef = useRef<Set<string>>(new Set());
  // Tracks `${puzzle.id}#${currentIndex}` so failure re-insertion is only scheduled once per attempt
  const scheduledReinsertionsRef = useRef<Set<string>>(new Set());

  const [puzzleStatus, setPuzzleStatus] = useState<PuzzleStatus>("loading");
  const [streak, setStreak] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<"reels" | "rank" | "profile">("reels");

  // Account, Friends & Placement Calibration States
  const [userAccount, setUserAccount] = useState<UserAccount | null>(() =>
    readRegisteredAccount()
  );
  const [authModalTab, setAuthModalTab] = useState<"register" | "login">("register");
  const [authModalGoogle, setAuthModalGoogle] = useState<boolean>(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [isCalibratedModalOpen, setIsCalibratedModalOpen] = useState<boolean>(false);
  const [calibratedFinalElo, setCalibratedFinalElo] = useState<number>(800);
  const [isStatsModalOpen, setIsStatsModalOpen] = useState<boolean>(false);
  const [oauthAlert, setOauthAlert] = useState<string | null>(null);
  const [incomingFriendRequestsCount, setIncomingFriendRequestsCount] = useState<number>(0);

  // Fetch pending incoming friend requests count for header badge
  useEffect(() => {
    const effectiveId = userAccount?.id || guestId;
    if (!effectiveId) return;
    let isMounted = true;
    fetch(`/api/friends?userId=${encodeURIComponent(effectiveId)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (isMounted && data && typeof data.incomingCount === "number") {
          setIncomingFriendRequestsCount(data.incomingCount);
        }
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, [userAccount?.id, guestId, activeTab]);

  // Account switch detection: tracks previous userId to wipe stale queues and cached state
  const previousUserIdRef = useRef<string | null>(null);
  const handleEloUpdateRef = useRef<(newElo: number, change: number, isWin?: boolean, puzzleId?: string, isRequeued?: boolean) => void>(() => {});

  // Daily streak, solve combo & puzzle totals tracking
  const {
    dailyStreak,
    streakFreezes,
    perfectWeekCounter,
    isFrozenState,
    hasSolvedToday,
    combo,
    bestCombo,
    totalSolved,
    totalFailed,
    lastPlayedDate,
    recordPuzzlePlay,
  } = useStreak();

  const [isStreakDropdownOpen, setIsStreakDropdownOpen] = useState(false);

  // Tier Quota & Ad Rules: Free: 15 puzzles / 4h, Ads every 3 puzzles; Pro: Unlimited & 0 Ads
  const {
    isPro,
    canPlay,
    puzzlesRemaining,
    applyBonusRecharge,
    windowLimit,
    windowHours,
    resetsInMs,
    resetsAt,
    nextChargeInMs,
    nextChargeAt,
    fullChargeInMs,
    isQuotaModalOpen,
    setIsQuotaModalOpen,
    recordPuzzlePlayed,
    refreshSubscription,
    syncWithServer,
  } = useTierQuota(userAccount?.id || guestId, userAccount?.plan);

  const [paywallReason, setPaywallReason] = useState<"quota" | "practice">("quota");
  const [isBatteryMenuOpen, setIsBatteryMenuOpen] = useState(false);
  const [batteryNow, setBatteryNow] = useState(0);
  const batteryMenuRef = useRef<HTMLDivElement>(null);

  const [isRewardedAdOpen, setIsRewardedAdOpen] = useState(false);
  const [puzzlesPlayedInSession, setPuzzlesPlayedInSession] = useState(0);
  const [showReelAd, setShowReelAd] = useState(false);
  const countedSessionPuzzlesRef = useRef<Set<string>>(new Set());

  // Purge any stale 4/4 quota regression in localStorage on initial client hydration
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const rawStats = window.localStorage.getItem("chessreels_user_stats_v1");
      if (rawStats) {
        const parsed = JSON.parse(rawStats);
        if (parsed.windowLimit && parsed.windowLimit < 15) {
          parsed.windowLimit = 15;
          window.localStorage.setItem("chessreels_user_stats_v1", JSON.stringify(parsed));
        }
      }
      const rawTier = window.localStorage.getItem("chess_reel_tier_config");
      if (rawTier) {
        const parsed = JSON.parse(rawTier);
        if (parsed.freePuzzleLimit && parsed.freePuzzleLimit < 15) {
          parsed.freePuzzleLimit = 15;
          window.localStorage.setItem("chess_reel_tier_config", JSON.stringify(parsed));
        }
      }
    } catch {}
  }, []);

  // Continuous Dynamic Battery: tick every second whenever battery is not full (< 15) and user is not Pro
  useEffect(() => {
    const shouldTick = isBatteryMenuOpen || (puzzlesRemaining < windowLimit && !isPro);
    if (!shouldTick) return;

    const updateTime = () => setBatteryNow(Date.now());
    updateTime();
    const interval = window.setInterval(updateTime, 1000);
    return () => window.clearInterval(interval);
  }, [isBatteryMenuOpen, puzzlesRemaining, isPro, windowLimit]);

  const REFILL_INTERVAL_MS = 16 * 60 * 1000;
  let effectiveNextChargeAt = nextChargeAt;
  if (!effectiveNextChargeAt && resetsAt > 0 && puzzlesRemaining < windowLimit) {
    const chargesNeeded = Math.max(1, windowLimit - puzzlesRemaining);
    effectiveNextChargeAt = Math.max(Date.now() + 1000, resetsAt - (chargesNeeded - 1) * REFILL_INTERVAL_MS);
  } else if (!effectiveNextChargeAt && puzzlesRemaining < windowLimit && batteryNow > 0) {
    effectiveNextChargeAt = batteryNow + REFILL_INTERVAL_MS;
  }

  // Live progressive refill tick check
  useEffect(() => {
    if (isPro || puzzlesRemaining >= windowLimit || !effectiveNextChargeAt || batteryNow <= 0) return;
    if (batteryNow >= effectiveNextChargeAt) {
      applyBonusRecharge(Math.min(windowLimit, puzzlesRemaining + 1));
      syncWithServer?.();
    }
  }, [batteryNow, effectiveNextChargeAt, isPro, puzzlesRemaining, windowLimit, applyBonusRecharge, syncWithServer]);

  const msToNextCharge =
    batteryNow > 0 && effectiveNextChargeAt > batteryNow
      ? Math.max(0, effectiveNextChargeAt - batteryNow)
      : puzzlesRemaining < windowLimit ? REFILL_INTERVAL_MS : 0;

  const nextMinutes = Math.floor(msToNextCharge / 60000);
  const nextSeconds = Math.floor((msToNextCharge % 60000) / 1000);
  const formattedNextCharge =
    nextMinutes > 0
      ? `${nextMinutes}m ${nextSeconds}s`
      : `${nextSeconds}s`;

  const resetAt = resetsAt || (batteryNow > 0 ? batteryNow + resetsInMs : 0);
  const rechargeCountdown =
    batteryNow > 0 && resetAt > 0
      ? getRechargeParts(resetAt, batteryNow)
      : { hours: 0, minutes: 0, seconds: 0 };
  const formattedCountdown =
    rechargeCountdown.hours > 0
      ? `${rechargeCountdown.hours}h ${rechargeCountdown.minutes}m`
      : rechargeCountdown.minutes > 0
      ? `${rechargeCountdown.minutes}m ${rechargeCountdown.seconds}s`
      : rechargeCountdown.seconds > 0
      ? `${rechargeCountdown.seconds}s`
      : "ready";

  useEffect(() => {
    if (!isBatteryMenuOpen) return;

    const handleOutsideClick = (event: MouseEvent) => {
      if (!batteryMenuRef.current?.contains(event.target as Node)) {
        setIsBatteryMenuOpen(false);
      }
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsBatteryMenuOpen(false);
    };

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isBatteryMenuOpen]);

  useEffect(() => {
    const handleOpenPaywall = (e: Event) => {
      const detail = (e as CustomEvent<{ reason?: "quota" | "practice" }>).detail;
      setPaywallReason(detail?.reason || "practice");
      setIsQuotaModalOpen(true);
    };
    const handleOpenAuth = (e: Event) => {
      const detail = (e as CustomEvent<{ tab?: "register" | "login" }>).detail;
      setAuthModalTab(detail?.tab || "login");
      setAuthModalGoogle(false);
      setIsAuthModalOpen(true);
    };
    const handleOpenProfile = () => {
      setActiveTab("profile");
    };
    const handleTestStatus = (e: Event) => {
      const customEvent = e as CustomEvent<{ status: PuzzleStatus }>;
      if (customEvent.detail?.status) {
        setPuzzleStatus(customEvent.detail.status);
      }
    };
    const handleTestElo = (e: Event) => {
      const customEvent = e as CustomEvent<{
        delta: number;
        newElo?: number;
        isWin?: boolean;
        puzzleId?: string;
        bypassGuard?: boolean;
        isRequeued?: boolean;
      }>;
      if (customEvent.detail?.delta !== undefined) {
        let delta = customEvent.detail.delta;
        const isWin = customEvent.detail.isWin !== undefined ? customEvent.detail.isWin : delta > 0;
        const pId = customEvent.detail.puzzleId;
        const isRequeued = Boolean(customEvent.detail.isRequeued);
        const ratingState = pId ? puzzleRatingHistoryRef.current[pId] : undefined;

        if (isWin && (isRequeued || ratingState === "failed_once")) {
          delta = Math.max(1, Math.round(delta * 0.5));
        }

        const targetElo = customEvent.detail.newElo ?? (currentEloRef.current + delta);
        if (!customEvent.detail.bypassGuard && pId) {
          if (ratingState === "solved" || ratingState === "redeemed") {
            return;
          }
        }
        handleEloUpdateRef.current(targetElo, delta, isWin, pId, isRequeued);
      }
    };
    window.addEventListener("open-quota-paywall", handleOpenPaywall);
    window.addEventListener("open-auth-modal", handleOpenAuth);
    window.addEventListener("open-profile-modal", handleOpenProfile);
    window.addEventListener("chess-reel-test-status", handleTestStatus);
    window.addEventListener("chess-reel-test-elo-update", handleTestElo);
    return () => {
      window.removeEventListener("open-quota-paywall", handleOpenPaywall);
      window.removeEventListener("open-auth-modal", handleOpenAuth);
      window.removeEventListener("open-profile-modal", handleOpenProfile);
      window.removeEventListener("chess-reel-test-status", handleTestStatus);
      window.removeEventListener("chess-reel-test-elo-update", handleTestElo);
    };
  }, [setIsQuotaModalOpen]);

  const fallbackIndexRef = useRef<number>(0);
  const currentEloRef = useRef<number>(currentElo);

  useEffect(() => {
    currentEloRef.current = currentElo;
  }, [currentElo]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      (window as any).__triggerAdModal = () => setShowReelAd(true);
      (window as any).__triggerReelAd = () => setShowReelAd(true);
      (window as any).__triggerQuotaModal = () => setIsQuotaModalOpen(true);
    }
  }, [setIsQuotaModalOpen]);

  // Calibration placement status
  const isCalibrating = Boolean(userAccount && !userAccount.isCalibrated);
  const currentCalibrationStep = isCalibrating
    ? Math.min(6, (userAccount?.calibrationStep ?? 0) + 1)
    : 0;

  // Subscription to online status
  const isOnline = useSyncExternalStore(
    subscribeToOnline,
    getOnlineSnapshot,
    getOnlineServerSnapshot
  );

  const [isHydrated, setIsHydrated] = useState<boolean>(false);
  const [isLoadingSession, setIsLoadingSession] = useState<boolean>(true);

  useEffect(() => {
    // Hydrate the HUD from the synchronous localStorage caches before revealing
    // dynamic values. SSR renders the same neutral skeleton as the first client
    // render, so React never sees a server/client text mismatch.
    if (typeof window !== "undefined") {
      try {
        const cachedStats = getStoredUserStats();
        if (cachedStats.elo > 0) {
          setCurrentElo((prev) => (prev === cachedStats.elo ? prev : cachedStats.elo));
        }
      } catch {}
      window.dispatchEvent(new Event("tier-session-updated"));
    }
    setIsHydrated(true);
    setIsLoadingSession(false);
    const handleAccountSync = () => {
      try {
        const raw = window.localStorage.getItem(ACCOUNT_STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (isGuestAccount(parsed)) {
            clearGuestLocalSession();
            setUserAccount(null);
            router.replace("/");
            return;
          }
          setUserAccount(parsed);
          if (parsed.elo) setCurrentElo(parsed.elo);
        } else {
          setUserAccount(null);
        }
      } catch {}
    };
    window.addEventListener("account-updated", handleAccountSync);
    return () => window.removeEventListener("account-updated", handleAccountSync);
  }, [router]);

  useEffect(() => {
    if (!isHydrated) return;
    try {
      const raw = window.localStorage.getItem(ACCOUNT_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (isGuestAccount(parsed) || (userAccount && isGuestAccount(userAccount))) {
        clearGuestLocalSession();
        setUserAccount(null);
        router.replace("/");
      }
    } catch {}
  }, [isHydrated, userAccount, router]);

  useEffect(() => {
    if (!isHydrated || !userAccount?.id || isGuestAccount(userAccount)) return;

    let cancelled = false;
    fetch(`/api/user/stats?userId=${encodeURIComponent(userAccount.id)}`, { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled) return;
        if (data?.stats) {
          const dbStats = {
            ...data.stats,
            puzzlesRemaining: data.puzzlesRemaining ?? data.stats.puzzlesRemaining,
            nextQuotaRefillTime: data.nextQuotaRefillTime ?? data.stats.nextQuotaRefillTime,
          };
          setCurrentElo(dbStats.elo);
          currentEloRef.current = dbStats.elo;
          window.localStorage.setItem("chessreels_user_stats_v1", JSON.stringify(dbStats));
        }
        if (data?.puzzlesRemaining !== undefined) {
          applyBonusRecharge(
            data.puzzlesRemaining,
            data.nextQuotaRefillTime,
            data.nextChargeInMs,
            data.fullChargeInMs
          );
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [isHydrated, userAccount?.id, applyBonusRecharge]);

  // Deep-link from other Pro CTAs (onboarding upsell, stats page) into checkout.
  useEffect(() => {
    if (!isHydrated || !userAccount?.id || isPro) return;
    try {
      const shouldOpen = window.localStorage.getItem("chess_reel_open_paywall");
      if (shouldOpen) {
        window.localStorage.removeItem("chess_reel_open_paywall");
        setPaywallReason("quota");
        setIsQuotaModalOpen(true);
      }
    } catch {}
  }, [isHydrated, isPro, setIsQuotaModalOpen, userAccount?.id]);

  // Initialize persistent guest ID, saved account, and saved Elo from localStorage
  // Sync landing visibility to hide/show dock
  useEffect(() => {
    if (typeof window !== "undefined") {
      const isLanding = !userAccount && isHydrated;
      window.dispatchEvent(
        new CustomEvent("landing-visibility", {
          detail: { visible: isLanding },
        })
      );
    }
  }, [userAccount, isHydrated]);

  useEffect(() => {
    if (typeof window === "undefined") return;

      try {
        window.localStorage.removeItem(GUEST_ID_KEY);
        window.localStorage.removeItem("chess_reel_preview_guest");
        setGuestId("");

        // 2. Check for Google OAuth callback user cookie & URL params
        if (typeof document !== "undefined") {
          const cookieMatch = document.cookie.match(/chess_reel_oauth_user=([^;]+)/);
          if (cookieMatch && cookieMatch[1]) {
            try {
              let raw = cookieMatch[1];
              try {
                raw = decodeURIComponent(raw);
              } catch {}
              const oauthUser = JSON.parse(raw);
              document.cookie = "chess_reel_oauth_user=; path=/; max-age=0";
              if (oauthUser && oauthUser.id && !isGuestAccount(oauthUser)) {
                document.cookie = `chess_reel_session=${encodeURIComponent(oauthUser.id)}; path=/; max-age=${60 * 60 * 24 * 30}`;
                window.localStorage.setItem(ACCOUNT_STORAGE_KEY, JSON.stringify(oauthUser));
                if (oauthUser.elo) {
                  window.localStorage.setItem(ELO_STORAGE_KEY, String(oauthUser.elo));
                }
                if (oauthUser.plan) {
                  window.localStorage.setItem("chess_reel_plan", oauthUser.plan);
                  window.dispatchEvent(new Event("plan-updated"));
                }
                setUserAccount(oauthUser);
                hydrateUserSession(oauthUser);
                if (oauthUser.elo) setCurrentElo(oauthUser.elo);
                if (Array.isArray(oauthUser.solvedPuzzleIds) && oauthUser.solvedPuzzleIds.length > 0) {
                  setSolvedPuzzleIds((prev) => {
                    const next = new Set(prev);
                    oauthUser.solvedPuzzleIds.forEach((id: string) => next.add(id));
                    return next;
                  });
                }
                window.dispatchEvent(new Event("account-updated"));
                if (window.location.search.includes("google_auth=success")) {
                  window.history.replaceState({}, document.title, window.location.pathname);
                }
              } else {
                clearGuestLocalSession();
                router.replace("/");
              }
            } catch {
              clearGuestLocalSession();
              router.replace("/");
            }
          }

          // Check for OAuth messages / errors
          const searchParams = new URLSearchParams(window.location.search);
          const oauthInfo = searchParams.get("oauth_info");
          const oauthError = searchParams.get("oauth_error");
          if (oauthInfo === "google_credentials_required") {
            setOauthAlert("Google OAuth: Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env to connect live accounts. Quick Test Sign-In is ready.");
            window.history.replaceState({}, document.title, window.location.pathname);
          } else if (oauthError) {
            setOauthAlert(`Google OAuth notification: ${oauthError.replace(/_/g, " ")}`);
            window.history.replaceState({}, document.title, window.location.pathname);
          }
        }

        // 3. Saved Account
        const savedAccountRaw = window.localStorage.getItem(ACCOUNT_STORAGE_KEY);
        if (savedAccountRaw) {
          try {
            const parsed = JSON.parse(savedAccountRaw);
            if (parsed && parsed.id && !isGuestAccount(parsed)) {
              setUserAccount(parsed);
              if (parsed.elo) {
                setCurrentElo(parsed.elo);
              }
              fetch(`/api/user/account?userId=${encodeURIComponent(parsed.id)}`)
                .then((res) => (res.ok ? res.json() : null))
                .then((data) => {
                  if (data?.user) {
                    if (isGuestAccount(data.user)) {
                      clearGuestLocalSession();
                      setUserAccount(null);
                      router.replace("/");
                      return;
                    }
                    setUserAccount(data.user);
                    hydrateUserSession(data.user);
                    const merged = mergeDbStatsWithLocal(data.user);
                    setCurrentElo(merged.elo);
                    currentEloRef.current = merged.elo;
                    if (Array.isArray(data.user.solvedPuzzleIds) && data.user.solvedPuzzleIds.length > 0) {
                      setSolvedPuzzleIds((prev) => {
                        const next = new Set(prev);
                        data.user.solvedPuzzleIds.forEach((id: string) => next.add(id));
                        return next;
                      });
                    }
                  }
                })
                .catch(() => {});
            } else {
              clearGuestLocalSession();
              setUserAccount(null);
              router.replace("/");
              return;
            }
          } catch {
            clearGuestLocalSession();
            setUserAccount(null);
            router.replace("/");
            return;
          }
        } else {
          // Check if valid session cookie exists
          const sessionCookie =
            typeof document !== "undefined"
              ? document.cookie
                  .split("; ")
                  .find((row) => row.startsWith("chess_reel_session="))
                  ?.split("=")[1]
              : null;
          const decodedSession = sessionCookie ? decodeURIComponent(sessionCookie) : null;
          if (decodedSession && !isGuestUserId(decodedSession)) {
            fetch(`/api/user/account?userId=${encodeURIComponent(decodedSession)}`)
              .then((res) => (res.ok ? res.json() : null))
              .then((data) => {
                if (data?.user && !isGuestAccount(data.user)) {
                  setUserAccount(data.user);
                  hydrateUserSession(data.user);
                  const merged = mergeDbStatsWithLocal(data.user);
                  setCurrentElo(merged.elo);
                  currentEloRef.current = merged.elo;
                  if (Array.isArray(data.user.solvedPuzzleIds) && data.user.solvedPuzzleIds.length > 0) {
                    setSolvedPuzzleIds((prev) => {
                      const next = new Set(prev);
                      data.user.solvedPuzzleIds.forEach((id: string) => next.add(id));
                      return next;
                    });
                  }
                } else {
                  clearGuestLocalSession();
                  setUserAccount(null);
                  router.replace("/");
                }
              })
              .catch(() => {
                clearGuestLocalSession();
                setUserAccount(null);
                router.replace("/");
              });
          } else {
            clearGuestLocalSession();
            setUserAccount(null);
            router.replace("/");
          }
        }
      } catch (e) {
        console.warn("Storage access restricted:", e);
      }
      setIsLoadingSession(false);
  }, [router]);

  // Account switch detection: wipe previous user's queue and reload for the new user
  useEffect(() => {
    const currentUserId = userAccount?.id || null;
    if (previousUserIdRef.current && currentUserId && previousUserIdRef.current !== currentUserId) {
      clearAllUserAndPuzzleCache(previousUserIdRef.current);
      setQueue([]);
      setCurrentIndex(0);
      setSolvedPuzzleIds(new Set());
      setPuzzleStatus("loading");
      initialFetchDoneRef.current = false;
      const elo = userAccount?.elo || 800;
      fetch(`/api/puzzle/random?elo=${elo}&count=5&userId=${encodeURIComponent(currentUserId)}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data) {
            const arr: PuzzleData[] = Array.isArray(data) ? data : [data];
            const filtered = arr.filter((p) => p && !solvedPuzzleIdsRef.current.has(p.id)).map(ensurePuzzleInstanceId);
            if (filtered.length > 0) {
              setQueue(filtered);
              setCurrentIndex(0);
              setPuzzleStatus("playing");
              saveQueue(filtered.slice(1), currentUserId);
            }
          }
        })
        .catch(() => {});
    }
    previousUserIdRef.current = currentUserId;
  }, [userAccount?.id]);

  // When currentIndex changes, prepare fresh mistake tracking for this puzzle
  useEffect(() => {
    const p = queue[currentIndex];
    if (p) {
      const instanceKey = p.instanceId || `${p.id}_attempt_1`;
      failedAttemptPuzzleIdsRef.current.delete(instanceKey);
      failedAttemptPuzzleIdsRef.current.delete(p.id);
    }
  }, [currentIndex, queue]);

  // Spaced-Repetition: Schedule clean reset copy of failed puzzle at offset = 10 + floor(rand * 5)
  const scheduleFailedPuzzleReinsertion = useCallback(
    async (failedPuzzle: PuzzleData, fromIndex: number) => {
      const offset = 10 + Math.floor(Math.random() * 5); // 10..14
      const nextAttempt = (failedPuzzle.attemptCount || puzzleAttemptCountRef.current[failedPuzzle.id] || 1) + 1;
      puzzleAttemptCountRef.current[failedPuzzle.id] = nextAttempt;
      const cleanResetCopy: PuzzleData = {
        ...failedPuzzle,
        instanceId: `${failedPuzzle.id}_attempt_${nextAttempt}`,
        isRequeued: true,
        hasBeenRated: false,
        attemptCount: nextAttempt,
        attemptNumber: nextAttempt,
      };
      const currentGap = queue.length - fromIndex;

      if (currentGap <= 10) {
        try {
          const elo = currentEloRef.current;
          const targetUserId = userAccount?.id || guestId;
          const userParam = targetUserId ? `&userId=${encodeURIComponent(targetUserId)}` : "";
          const needed = Math.max(10, fromIndex + offset + 2 - queue.length);
          const fetchCount = Math.min(10, Math.max(5, needed));

          const res = await fetch(`/api/puzzle/random?elo=${elo}&count=${fetchCount}${userParam}`);
          let newBatch: PuzzleData[] = [];
          if (res.ok) {
            const data = await res.json();
            const arr: PuzzleData[] = Array.isArray(data) ? data : [data];
            newBatch = arr.filter((p) => p && !solvedPuzzleIds.has(p.id)).map(ensurePuzzleInstanceId);
          }

          setQueue((prevQueue) => {
            const extended = newBatch.length > 0 ? [...prevQueue, ...newBatch] : [...prevQueue];
            const insertIndex = Math.min(fromIndex + offset, extended.length);
            const updated = [...extended];
            updated.splice(insertIndex, 0, cleanResetCopy);
            return updated;
          });
        } catch {
          setQueue((prevQueue) => {
            const insertIndex = Math.min(fromIndex + offset, prevQueue.length);
            const updated = [...prevQueue];
            updated.splice(insertIndex, 0, cleanResetCopy);
            return updated;
          });
        }
      } else {
        setQueue((prevQueue) => {
          const insertIndex = Math.min(fromIndex + offset, prevQueue.length);
          const updated = [...prevQueue];
          updated.splice(insertIndex, 0, cleanResetCopy);
          return updated;
        });
      }
    },
    [queue.length, userAccount?.id, guestId, solvedPuzzleIds, ensurePuzzleInstanceId]
  );

  // Status Change Handler with Solved & Failed Rules
  const handleStatusChange = useCallback(
    (status: PuzzleStatus) => {
      setPuzzleStatus(status);
      const puzzle = queue[currentIndex];
      if (!puzzle) return;

      const instanceKey = puzzle.instanceId || `${puzzle.id}_attempt_1`;

      if (status === "failed") {
        const puzzleKey = puzzle.instanceId || puzzle.id;
        if (!countedSessionPuzzlesRef.current.has(puzzleKey)) {
          countedSessionPuzzlesRef.current.add(puzzleKey);
          setPuzzlesPlayedInSession((prev) => prev + 1);
        }

        const attemptKey = `${instanceKey}#${currentIndex}`;
        failedAttemptPuzzleIdsRef.current.add(instanceKey);
        failedAttemptPuzzleIdsRef.current.add(puzzle.id);

        if (!scheduledReinsertionsRef.current.has(attemptKey)) {
          scheduledReinsertionsRef.current.add(attemptKey);
          scheduleFailedPuzzleReinsertion(puzzle, currentIndex);
        }
      } else if (status === "solved") {
        const puzzleKey = puzzle.instanceId || puzzle.id;
        if (!countedSessionPuzzlesRef.current.has(puzzleKey)) {
          countedSessionPuzzlesRef.current.add(puzzleKey);
          setPuzzlesPlayedInSession((prev) => prev + 1);
        }

        const hasFailedOnThisAttempt =
          failedAttemptPuzzleIdsRef.current.has(instanceKey) ||
          failedAttemptPuzzleIdsRef.current.has(puzzle.id);

        setPuzzleStates((prev) => {
          if (prev[instanceKey]?.status === "solved") return prev;
          return {
            ...prev,
            [instanceKey]: {
              status: "solved",
              moveHistory: prev[instanceKey]?.moveHistory || [],
              viewMoveIndex: prev[instanceKey]?.viewMoveIndex || 0,
            },
          };
        });

        // Continuous Ranked Play: consume free tier quota on genuine solve (only once per puzzle ID, and only if not failed on this attempt)
        if (!isCalibrating && !solvedPuzzleIdsRef.current.has(puzzle.id) && !countedQuotaPuzzleIdsRef.current.has(puzzle.id) && !hasFailedOnThisAttempt) {
          countedQuotaPuzzleIdsRef.current.add(puzzle.id);
          recordPuzzlePlayed(true, puzzle.id);
        }

        // Only mark permanently as solved in solvedPuzzleIds IF they didn't fail on this attempt!
        if (!hasFailedOnThisAttempt) {
          recordPuzzlePlay("win");
          setSolvedPuzzleIds((prev) => {
            if (prev.has(puzzle.id)) return prev;
            const next = new Set(prev);
            next.add(puzzle.id);
            return next;
          });
        }
      }
    },
    [queue, currentIndex, scheduleFailedPuzzleReinsertion, isCalibrating, recordPuzzlePlayed]
  );

  // Swipe Up / Next Puzzle navigation: strictly increment currentIndex to a new puzzle ID & deduplicate against solved
  const goToNextPuzzle = useCallback(async (bypassAd: boolean = false) => {
    if (!bypassAd && !isPro && !isCalibrating && puzzlesPlayedInSession > 0 && puzzlesPlayedInSession % 3 === 0 && !showReelAd) {
      setShowReelAd(true);
      return;
    }
    setShowReelAd(false);

    const userCanPlay = canPlay || puzzlesRemaining > 0;
    if (!userCanPlay && puzzlesRemaining <= 0 && !isPro && !isCalibrating) {
      if (!currentPuzzle) {
        const lastSolvedRaw =
          typeof window !== "undefined"
            ? window.localStorage.getItem("chess_reel_last_solved_puzzle")
            : null;
        if (lastSolvedRaw) {
          try {
            const p = JSON.parse(lastSolvedRaw);
            setQueue((prev) => [ensurePuzzleInstanceId(p), ...prev]);
            setCurrentIndex(0);
          } catch {}
        }
      }
      setPuzzleStatus("solved");
      setPaywallReason("quota");
      setIsQuotaModalOpen(true);
      return;
    }

    setSlideDirection("next");
    const currentP = queue[currentIndex];
    const currentId = currentP?.id;
    const currentSolved = solvedPuzzleIdsRef.current;
    const elo = currentEloRef.current;
    const targetUserId = userAccount?.id;

    // Buffer management: prefetch & pull ahead when within 3 puzzles of queue end
    if (currentIndex + 1 >= queue.length - 3) {
      prefetchPuzzles(elo, 5, targetUserId).catch(() => {});
    }

    // 1. If user previously navigated backward in the feed, advance to the existing next puzzle in history
    if (currentIndex + 1 < queue.length) {
      const nextIndex = currentIndex + 1;
      const nextP = queue[nextIndex];
      const nextKey = nextP ? (nextP.instanceId || nextP.id) : "";
      setSlideDirection("next");
      setCurrentIndex(nextIndex);
      if (nextKey && puzzleStatesRef.current[nextKey]) {
        setPuzzleStatus(puzzleStatesRef.current[nextKey].status);
      } else {
        setPuzzleStatus("playing");
      }
      return;
    }

    // 2. No upcoming puzzle in active queue; pop from local cache or fetch fresh
    let nextPuzzle: PuzzleData | null = null;
    while (true) {
      const popped = popNextPuzzle(targetUserId);
      if (!popped) break;
      if (popped.id !== currentId && !currentSolved.has(popped.id) && !ratedPuzzleIdsRef.current.has(popped.id)) {
        nextPuzzle = popped;
        break;
      }
    }

    if (nextPuzzle) {
      setQueue((prev) => [...prev.slice(0, currentIndex + 1), ensurePuzzleInstanceId(nextPuzzle!)]);
      setCurrentIndex(currentIndex + 1);
      setPuzzleStatus("playing");
      prefetchPuzzles(elo, 5, targetUserId).catch(() => {});
      return;
    }

    // 3. Fetch fresh deduplicated puzzles from API
    setPuzzleStatus("loading");
    try {
      const userParam = targetUserId ? `&userId=${encodeURIComponent(targetUserId)}` : "";
      const res = await fetch(`/api/puzzle/random?elo=${elo}&count=5${userParam}`);
      if (res.ok) {
        const data = await res.json();
        const arr: PuzzleData[] = Array.isArray(data) ? data : [data];
        const validBatch = arr
          .filter((p) => p && p.id !== currentId && !currentSolved.has(p.id) && !ratedPuzzleIdsRef.current.has(p.id))
          .map(ensurePuzzleInstanceId);

        if (validBatch.length > 0) {
          const chosen = validBatch[0];
          setQueue((prev) => [...prev.slice(0, currentIndex + 1), chosen]);
          setCurrentIndex(currentIndex + 1);
          setPuzzleStatus("playing");

          if (validBatch.length > 1) {
            saveQueue([...getStoredQueue(targetUserId), ...validBatch.slice(1)], targetUserId);
          }
          return;
        }
      }
    } catch (e) {
      console.error("Failed to load next puzzle:", e);
    }
  }, [
    canPlay,
    isPro,
    isCalibrating,
    puzzlesPlayedInSession,
    showReelAd,
    currentPuzzle,
    currentIndex,
    queue,
    userAccount?.id,
    setIsQuotaModalOpen,
    ensurePuzzleInstanceId,
  ]);

  // Swipe Down / Previous Puzzle navigation
  const goToPrevPuzzle = useCallback(() => {
    setShowReelAd(false);
    if (currentIndex > 0) {
      const prevIndex = currentIndex - 1;
      const prevPuzzle = queue[prevIndex];
      const prevKey = prevPuzzle ? (prevPuzzle.instanceId || prevPuzzle.id) : "";
      setSlideDirection("prev");
      setCurrentIndex(prevIndex);
      if (prevKey && puzzleStatesRef.current[prevKey]) {
        setPuzzleStatus(puzzleStatesRef.current[prevKey].status);
      } else {
        setPuzzleStatus("playing");
      }
    }
  }, [currentIndex, queue]);

  // Initial puzzle fetch on mount: wait until user session is loaded
  const initialFetchDoneRef = useRef(false);
  useEffect(() => {
    if (!isHydrated) return;
    if (!userAccount || !userAccount.id) return;

    const userCanPlay = canPlay || puzzlesRemaining > 0;
    if (userCanPlay || isPro || isCalibrating) {
      if (!initialFetchDoneRef.current) {
        initialFetchDoneRef.current = true;
        const elo = userAccount.elo || currentEloRef.current || 800;
        const targetUserId = userAccount.id;

        // Check local prefetch buffer first - verify it matches user's elo
        const cached = popNextPuzzle(targetUserId);
        if (cached && !solvedPuzzleIdsRef.current.has(cached.id) && Math.abs(cached.rating - elo) <= 250) {
          setQueue([ensurePuzzleInstanceId(cached)]);
          setCurrentIndex(0);
          setPuzzleStatus("playing");
          prefetchPuzzles(elo, 5, targetUserId).catch(() => {});
          return;
        }

        setPuzzleStatus("loading");
        fetch(`/api/puzzle/random?elo=${elo}&count=5&userId=${encodeURIComponent(targetUserId)}`)
          .then((res) => (res.ok ? res.json() : null))
          .then((data) => {
            if (data) {
              const arr: PuzzleData[] = Array.isArray(data) ? data : [data];
              const filtered = arr.filter((p) => p && !solvedPuzzleIdsRef.current.has(p.id)).map(ensurePuzzleInstanceId);
              if (filtered.length > 0) {
                setQueue(filtered);
                setCurrentIndex(0);
                setPuzzleStatus("playing");
                saveQueue(filtered.slice(1), targetUserId);
                return;
              }
            }
            setPuzzleStatus("loading");
          })
          .catch(() => {
            setPuzzleStatus("loading");
          });
        prefetchPuzzles(elo, 5, targetUserId).catch(() => {});
      }
    } else {
      // Free user paywalled on mount/refresh: show previous solved puzzle and do not advance
      if (!initialFetchDoneRef.current && puzzlesRemaining <= 0) {
        const lastSolvedRaw =
          typeof window !== "undefined"
            ? window.localStorage.getItem("chess_reel_last_solved_puzzle")
            : null;
        if (lastSolvedRaw) {
          try {
            const p = JSON.parse(lastSolvedRaw);
            setQueue([ensurePuzzleInstanceId(p)]);
            setCurrentIndex(0);
          } catch {}
        }
        setPuzzleStatus("solved");
        setPaywallReason("quota");
        setIsQuotaModalOpen(true);
      }
    }
  }, [isHydrated, userAccount?.id, canPlay, isPro, isCalibrating, setIsQuotaModalOpen]);

  // Exact standard Elo calculation and instant optimistic UI payout
  const processEloResult = useCallback(
    (result: "win" | "loss", puzzle: PuzzleData) => {
      if (!puzzle) return;
      puzzle.hasBeenRated = true;

      // Mark hasBeenRated in queue state so this card is sealed
      setQueue((prevQueue) =>
        prevQueue.map((item) =>
          item.id === puzzle.id || (item.instanceId && item.instanceId === puzzle.instanceId)
            ? { ...item, hasBeenRated: true }
            : item
        )
      );

      const stats = getStoredUserStats();
      const userElo = stats.elo;
      const puzzleRating = puzzle.rating || 1200;
      const K = isCalibrating ? 64 : 32;

      const expectedScore = 1 / (1 + Math.pow(10, (puzzleRating - userElo) / 400));

      let eloDelta: number;
      if (result === "win") {
        const rawGain = Math.max(5, Math.round(K * (1 - expectedScore)));
        const isRequeued = Boolean(puzzle.isRequeued);
        const hasUsedHint = Boolean(puzzle.hintUsed);

        if (isRequeued && hasUsedHint) {
          // Both requeued and hint used: 25% gain (50% * 50%), min +1
          eloDelta = Math.max(1, Math.round(rawGain * 0.25));
        } else if (isRequeued || hasUsedHint) {
          // Either requeued or hint used: 50% gain, min +2
          eloDelta = Math.max(2, Math.round(rawGain * 0.5));
        } else {
          eloDelta = rawGain;
        }
      } else {
        eloDelta = -Math.max(5, Math.round(K * expectedScore));
      }

      const nextElo = Math.max(100, userElo + eloDelta);

      // Streak update
      const today = getTodayDateString();
      let nextStreak = stats.currentStreak;
      let nextLastDate = stats.lastSolvedDate;
      let nextIsFrozen = stats.isFrozenState;
      let nextFreezes = stats.streakFreezes;
      let nextPerfectWeek = stats.perfectWeekCounter;

      if (result === "win") {
        if (stats.lastSolvedDate !== today) {
          nextStreak = stats.currentStreak + 1;
          nextLastDate = today;
          nextIsFrozen = false;
          if (nextFreezes < 2) {
            nextPerfectWeek += 1;
            if (nextPerfectWeek >= 7) {
              nextFreezes = Math.min(2, nextFreezes + 1);
              nextPerfectWeek = 0;
            }
          } else {
            nextPerfectWeek = 0;
          }
        }
      }

      // Combo update: on fail, immediately reset combo to 0; on solve, only increment if cleanly solved without wrong move, not requeued, and without hint
      let nextCombo = stats.comboCount;
      if (result === "loss") {
        nextCombo = 0;
      } else if (!puzzle.hasFailed && !puzzle.isRequeued && !puzzle.hintUsed) {
        nextCombo = stats.comboCount + 1;
      }

      // Synchronous LocalStorage Save (Never 0)
      saveUserStatsSync({
        elo: nextElo,
        currentStreak: nextStreak,
        lastSolvedDate: nextLastDate,
        streakFreezes: nextFreezes,
        perfectWeekCounter: nextPerfectWeek,
        isFrozenState: nextIsFrozen,
        comboCount: nextCombo,
      });

      // 1. Immediate Optimistic UI Update
      setCurrentElo(nextElo);
      currentEloRef.current = nextElo;
      setLastEloChange(eloDelta);
      triggerEloDeltaBadge(eloDelta);

      recordPuzzlePlay(result === "win" ? "win" : "loss");
      if (result === "win") {
        markPuzzleSolved(puzzle.id);
        try {
          if (typeof window !== "undefined") {
            window.localStorage.setItem(
              "chess_reel_last_solved_puzzle",
              JSON.stringify(puzzle)
            );
          }
        } catch {}
      }

      // Record rating state in history
      const nextRatingState =
        result === "win"
          ? puzzle.isRequeued
            ? "redeemed"
            : "solved"
          : "failed_once";
      updatePuzzleRatingState(puzzle.id, nextRatingState);

      // 2. Reliable Database Persistence (Non-Blocking)
      const effectiveUserId = userAccount?.id || guestId;
      if (effectiveUserId) {
        fetch("/api/user/stats", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            elo: nextElo,
            streak: nextStreak,
            lastSolvedDate: nextLastDate,
            streakFreezes: nextFreezes,
            perfectWeekCounter: nextPerfectWeek,
            isFrozenState: nextIsFrozen,
            userId: userAccount?.id,
          }),
        }).catch(() => {});

        fetch("/api/user/update-elo", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            puzzleRating,
            currentUserElo: userElo,
            newElo: nextElo,
            eloDelta,
            result,
            status: result === "win" ? "solved" : "failed",
            userId: userAccount?.id,
            guestId,
            puzzleId: puzzle.id,
            dailyStreak: nextStreak,
            streakFreezes: nextFreezes,
            perfectWeekCounter: nextPerfectWeek,
            isFrozenState: nextIsFrozen,
            lastSolvedDate: nextLastDate,
            isRequeued: puzzle.isRequeued,
            hintUsed: puzzle.hintUsed,
            attemptCount: puzzle.attemptCount,
          }),
        }).catch((err) => {
          console.warn("Non-blocking DB persistence failed:", err);
        });
      }

      // 3. Calibration progression handling
      if (isCalibrating && userAccount) {
        const stepIndex = userAccount.calibrationStep ?? 0;
        const nextStep = stepIndex + 1;

        if (nextStep >= 6) {
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
              window.localStorage.removeItem(`chess_reel_tier_session_${userAccount.id}`);
              window.localStorage.removeItem("chess_reel_tier_session_guest");
              window.localStorage.removeItem("chess_reel_tier_session");
              window.localStorage.removeItem("chess_reel_last_solved_puzzle");
              window.dispatchEvent(new Event("tier-session-updated"));
            }
          } catch {}
        } else {
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
      }
    },
    [isCalibrating, userAccount, guestId, dailyStreak, updatePuzzleRatingState, markPuzzleSolved, triggerEloDeltaBadge, recordPuzzlePlay]
  );

  // Handle direct Elo update (e.g. from test events or explicit triggers)
  const handleEloUpdate = useCallback(
    (newElo: number, change: number, isWin?: boolean, puzzleId?: string, isRequeuedParam?: boolean) => {
      setCurrentElo((prev) => {
        const next = typeof newElo === "number" ? Math.max(100, newElo) : Math.max(100, prev + change);
        currentEloRef.current = next;
        saveUserStatsSync({ elo: next });
        try {
          if (typeof window !== "undefined") {
            window.localStorage.setItem(ELO_STORAGE_KEY, next.toString());
            const rawAcc = window.localStorage.getItem(ACCOUNT_STORAGE_KEY);
            if (rawAcc) {
              const parsedAcc = JSON.parse(rawAcc);
              window.localStorage.setItem(
                ACCOUNT_STORAGE_KEY,
                JSON.stringify({ ...parsedAcc, elo: next })
              );
            }
          }
        } catch {}
        return next;
      });

      setLastEloChange(change);
      triggerEloDeltaBadge(change);

      if (change > 0) {
        setStreak((prev) => prev + 1);
      } else if (change < 0) {
        setStreak(0);
      }

      if (puzzleId) {
        const nextRatingState =
          change > 0
            ? isRequeuedParam
              ? "redeemed"
              : "solved"
            : "failed_once";
        updatePuzzleRatingState(puzzleId, nextRatingState);
        if (change > 0) {
          markPuzzleSolved(puzzleId);
        }
      }
    },
    [triggerEloDeltaBadge, updatePuzzleRatingState, markPuzzleSolved]
  );

  useEffect(() => {
    handleEloUpdateRef.current = handleEloUpdate;
  });

  // Reset rating back to 800
  const handleResetElo = () => {
    setCurrentElo(800);
    setStreak(0);
    setLastEloChange(null);
    setCurrentIndex(0);
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
    setQueue([]);
    setPuzzleStatus("loading");
    const targetUserId = userAccount?.id;
    const userParam = targetUserId ? `&userId=${encodeURIComponent(targetUserId)}` : "";
    fetch(`/api/puzzle/random?elo=800&count=5${userParam}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) {
          const arr: PuzzleData[] = Array.isArray(data) ? data : [data];
          const filtered = arr.filter((p) => p && !solvedPuzzleIds.has(p.id)).map(ensurePuzzleInstanceId);
          if (filtered.length > 0) {
            setQueue(filtered);
            setCurrentIndex(0);
            setPuzzleStatus("playing");
          }
        }
      })
      .catch(() => {});
  };

  // Handle successful account creation or sign-in
  const handleAccountSuccess = (user: UserAccount) => {
    // Clear any previous user's cached puzzle queues and state
    clearAllUserAndPuzzleCache(userAccount?.id);

    setUserAccount(user);
    setCurrentElo(user.elo || 800);
    hydrateUserSession(user);

    try {
      if (typeof window !== "undefined") {
        document.cookie = `chess_reel_session=${encodeURIComponent(user.id)}; path=/; max-age=${60 * 60 * 24 * 30}`;
        window.localStorage.setItem(ACCOUNT_STORAGE_KEY, JSON.stringify(user));
        window.localStorage.setItem(ELO_STORAGE_KEY, (user.elo || 800).toString());
        if (user.plan) {
          window.localStorage.setItem("chess_reel_plan", user.plan);
          window.dispatchEvent(new Event("plan-updated"));
        } else {
          window.localStorage.removeItem("chess_reel_plan");
        }
        window.dispatchEvent(new Event("account-updated"));
        window.dispatchEvent(new Event("tier-session-updated"));
      }
    } catch {}

    setIsQuotaModalOpen(false);
    setSolvedPuzzleIds(new Set());
    setQueue([]);
    setPuzzleStatus("loading");
    setCurrentIndex(0);
    initialFetchDoneRef.current = true;

    fetch(`/api/user/stats?userId=${encodeURIComponent(user.id)}`, { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((statsData) => {
        if (statsData?.puzzlesRemaining !== undefined) {
          applyBonusRecharge(statsData.puzzlesRemaining, statsData.nextQuotaRefillTime);
        }
        if (statsData?.stats) {
          const dbStats = {
            ...statsData.stats,
            puzzlesRemaining: statsData.puzzlesRemaining ?? statsData.stats.puzzlesRemaining,
            nextQuotaRefillTime: statsData.nextQuotaRefillTime ?? statsData.stats.nextQuotaRefillTime,
          };
          setCurrentElo(dbStats.elo);
          currentEloRef.current = dbStats.elo;
          window.localStorage.setItem("chessreels_user_stats_v1", JSON.stringify(dbStats));
        }
      })
      .catch(() => {});

    fetch(`/api/puzzle/random?elo=${user.elo || 800}&count=5&userId=${encodeURIComponent(user.id)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) {
          const arr: PuzzleData[] = Array.isArray(data) ? data : [data];
          const filtered = arr.filter((p) => p && !solvedPuzzleIds.has(p.id)).map(ensurePuzzleInstanceId);
          if (filtered.length > 0) {
            setQueue(filtered);
            setCurrentIndex(0);
            setPuzzleStatus("playing");
            saveQueue(filtered.slice(1), user.id);
          }
        }
      })
      .catch(() => {});
  };

  // Sign out handler: clears all caches and transitions cleanly in a single step without landing page flash
  const handleSignOut = () => {
    const oldUserId = userAccount?.id;

    // 1. Optimistically clear local React state
    setUserAccount(null);
    setCurrentElo(0);
    currentEloRef.current = 0;
    setIsStatsModalOpen(false);
    setSolvedPuzzleIds(new Set());
    setQueue([]);
    setCurrentIndex(0);
    setActiveTab("reels");

    // 2. Synchronously wipe all local and session storages
    clearAllUserAndPuzzleCache(oldUserId);
    resetStreakStats();
    if (typeof window !== "undefined") {
      try {
        window.localStorage.removeItem("chessreels_user_stats_v1");
        window.localStorage.removeItem("quota_last_check");
        window.localStorage.removeItem("chess_reel_account");
        window.localStorage.removeItem("chess_reel_tier_config");
        window.sessionStorage.clear();
      } catch {}
    }
    if (typeof document !== "undefined") {
      document.cookie = "chess_reel_session=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    }

    // 3. Instant hard redirect to root
    if (typeof window !== "undefined") {
      window.location.href = "/";
    } else {
      router.replace("/");
    }
  };

  // Route guard: unauthenticated users redirect cleanly to '/'
  useEffect(() => {
    if (isHydrated && !userAccount) {
      router.replace("/");
    }
  }, [isHydrated, userAccount, router]);

  if (!userAccount && isHydrated) {
    return (
      <div className="min-h-screen bg-[#0a0908] flex items-center justify-center">
        <RefreshCw className="w-8 h-8 text-[#c29b78] animate-spin" />
      </div>
    );
  }

  return (
    <div className="bg-[#151413] font-sans text-[#f5f5f5] flex flex-col h-dvh max-h-dvh selection:bg-[#c29b78] selection:text-[#151413] overflow-hidden overscroll-none w-full select-none justify-between">
      {oauthAlert && (
        <div className="fixed top-16 inset-x-0 z-50 p-3 max-w-md mx-auto animate-in slide-in-from-top-2 duration-200">
          <div className="p-3 rounded-xl bg-[#22201e] border border-[#c29b78]/40 text-[#f5f5f5] text-xs flex items-start justify-between gap-2 shadow-2xl">
            <div className="flex items-start gap-2">
              <span className="material-symbols-outlined text-[#c29b78] text-base shrink-0 mt-0.5">info</span>
              <span>{oauthAlert}</span>
            </div>
            <button
              onClick={() => setOauthAlert(null)}
              className="text-[#c29b78] hover:text-white shrink-0 font-bold text-sm px-1 cursor-pointer flex items-center justify-center"
              aria-label="Dismiss notification"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* 1. Fixed Top Header */}
      <header className="fixed top-0 left-1/2 -translate-x-1/2 z-40 w-full max-w-[480px] bg-[#0f0e0d]/92 backdrop-blur-xl pt-safe border-b border-white/[0.06] rounded-b-2xl shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
        <div className="h-14 px-4 w-full flex items-center justify-between gap-2">
          {/* Brand Logo & Title */}
          <div className="flex items-center gap-2 shrink-0">
            <img
              src="/icons/icon.svg"
              alt=""
              aria-hidden="true"
              className="h-7 w-7 rounded-md object-contain"
            />
            <span className="font-black text-sm tracking-tight text-[#f5f5f5]">
              Doom<span className="text-[#c29b78]">Chess</span>
            </span>
            {isHydrated && isCalibrating && (
              <span className="text-[9px] tracking-wider uppercase text-[#c29b78] font-bold px-1.5 py-0.5 rounded bg-[#c29b78]/15 border border-[#c29b78]/30">
                {currentCalibrationStep}/6
              </span>
            )}
          </div>

          {/* Flush HUD: Rating | Streak | Quota/Pro | Leaderboard (NO rounded pills) */}
          <div suppressHydrationWarning className="flex items-center gap-3 sm:gap-3.5 shrink-0">
            {/* Flush Rating */}
            <div
              data-testid="rating-pill"
              suppressHydrationWarning
              className="flex items-center gap-1 font-bold text-xs text-[#c29b78]"
              title={`Your Rating: ${currentElo}`}
            >
              {!isHydrated || isLoadingSession ? (
                <span aria-label="Loading rating" className="h-5 w-20 rounded-sm bg-[#12100e] animate-pulse shadow-[inset_0_0_12px_rgba(194,155,120,.08)]" />
              ) : (
                <>
                  <Zap className="w-3.5 h-3.5 text-[#c29b78] fill-[#c29b78]" />
                  <AnimatedEloCounter value={currentElo} />
                </>
              )}
              <AnimatePresence>
                {showEloDeltaBadge && transientEloDelta !== null && (
                  <motion.span
                    key={`elo-delta-${deltaAnimationKey}`}
                    data-testid="elo-delta-badge"
                    initial={{ opacity: 0, y: 10, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -6, scale: 0.9 }}
                    transition={{ duration: 0.25, ease: "easeOut" }}
                    className={`text-[10px] font-black ${
                      transientEloDelta >= 0 ? "text-[#10b981]" : "text-[#ef4444]"
                    }`}
                  >
                    {transientEloDelta >= 0 ? `+${transientEloDelta}` : transientEloDelta}
                  </motion.span>
                )}
              </AnimatePresence>
            </div>

            {/* Flush Daily Streak Indicator with Flame States and Interactive Calendar Dropdown */}
            <div className="relative">
              <button
                type="button"
                data-testid="header-streak-dropdown-trigger"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsStreakDropdownOpen((prev) => !prev);
                }}
                className="flex items-center cursor-pointer select-none group focus:outline-none bg-transparent border-none p-0"
                title="Click to view streak calendar & freezes"
                aria-expanded={isStreakDropdownOpen}
              >
                <StreakFlameBadge
                  streak={dailyStreak}
                  isFrozenState={isFrozenState}
                  hasSolvedToday={hasSolvedToday}
                  lastSolvedDate={lastPlayedDate}
                  testId="header-streak-indicator"
                  flameTestId="header-flame-icon"
                  size="sm"
                />
              </button>

              {/* Streak Calendar & Freezes Dropdown Menu */}
              <StreakCalendarDropdown
                isOpen={isStreakDropdownOpen}
                onClose={() => setIsStreakDropdownOpen(false)}
                streak={dailyStreak}
                streakFreezes={streakFreezes}
                perfectWeekCounter={perfectWeekCounter}
                isFrozenState={isFrozenState}
                lastSolvedDate={lastPlayedDate}
              />
            </div>

            {/* Flush Solve Combo */}
            {isHydrated && combo >= 2 && (
              <div
                data-testid="header-combo-indicator"
                suppressHydrationWarning
                className="flex items-center gap-1 font-bold text-xs text-emerald-400 animate-in fade-in zoom-in-95 duration-200"
                title={`Solve Combo: ${combo} in a row without mistake!`}
              >
                <Zap className="w-3.5 h-3.5 text-emerald-400 fill-emerald-400 animate-pulse" />
                <span suppressHydrationWarning className="font-mono tracking-tight font-black">{combo}x</span>
              </div>
            )}

            {/* Free Tier Quota / Calibration (Hidden for Pro Members) */}
            {!isHydrated ? (
              // Keep the HUD footprint stable while localStorage caches hydrate.
              // Static markup here matches SSR exactly, so no fake numbers flash.
              <span
                aria-hidden="true"
                data-testid="header-loading-quota"
                className="flex items-center gap-1 text-[11px] font-bold invisible"
              >
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span className="font-mono text-zinc-200">0/0</span>
              </span>
            ) : isHydrated && isPro === true ? (
              <div ref={batteryMenuRef} className="relative">
                <button
                  onClick={() => setIsBatteryMenuOpen((open) => !open)}
                  data-testid="header-pro-quota-btn"
                  className="cursor-pointer transition-transform active:scale-95 flex items-center"
                  aria-label="View unlimited Pro charge"
                  aria-expanded={isBatteryMenuOpen}
                  suppressHydrationWarning
                >
                  <ChargeBattery remaining={15} unlimited={true} />
                </button>
                {isBatteryMenuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-64 rounded-xl border border-[#c29b78]/30 bg-[#0a0908] p-3.5 shadow-2xl z-50 backdrop-blur-xl">
                    <div className="flex items-center gap-2">
                      <InfinityIcon
                        className="w-4 h-4 text-[#c29b78] shrink-0"
                        strokeWidth={2.2}
                        aria-hidden="true"
                      />
                      <div className="text-[11px] font-bold tracking-wider text-[#c29b78] uppercase">
                        PRO ACCOUNT / INFINITE CHARGE
                      </div>
                    </div>
                    <div className="mt-1.5 text-[11px] leading-relaxed text-zinc-400">
                      Never wait for puzzle recharges.
                    </div>
                  </div>
                )}
              </div>
            ) : !(isHydrated && isPro === true) ? (
              isCalibrating ? (
                <div
                  className="flex items-center gap-1 text-[11px] font-bold text-[#c29b78]"
                  title={`Placement Calibration: Puzzle ${currentCalibrationStep} of 6 (Energy starts after placement)`}
                  data-testid="header-calibration-badge"
                >
                  <Target className="w-3.5 h-3.5 text-[#c29b78] stroke-[2]" />
                  <span>{currentCalibrationStep}/6</span>
                </div>
              ) : (
                <div ref={batteryMenuRef} className="relative">
                  <button
                    onClick={() => setIsBatteryMenuOpen((open) => !open)}
                    data-testid="header-quota-btn"
                    className="flex items-center gap-1 text-[11px] font-bold transition-all cursor-pointer active:scale-95"
                    title={`Energy: ${puzzlesRemaining}/${windowLimit} charges remaining this ${windowHours}h window. Tap for details.`}
                    aria-label="View energy charge"
                    aria-expanded={isBatteryMenuOpen}
                    suppressHydrationWarning
                  >
                    <ChargeBattery
                      remaining={isHydrated ? puzzlesRemaining : windowLimit}
                      unlimited={isPro}
                    />
                  </button>
                  {isBatteryMenuOpen && (
                    <div className="absolute right-0 top-full mt-2 w-64 rounded-xl border border-[#c29b78]/30 bg-[#0a0908] p-3.5 shadow-2xl z-50 backdrop-blur-xl">
                      {(() => {
                        const resetAt = resetsAt || batteryNow + resetsInMs;
                        const recharge = getRechargeParts(resetAt, batteryNow);
                        const isDepleted = puzzlesRemaining === 0;
                        const isFull = puzzlesRemaining >= windowLimit;

                        return (
                          <div className="space-y-3">
                            <div>
                              {isDepleted ? (
                                <div className="text-[11px] font-bold tracking-wide text-rose-400 uppercase">
                                  ENERGY DEPLETED (0/{windowLimit})
                                </div>
                              ) : (
                                <div className="text-xs font-semibold text-zinc-100">
                                  {puzzlesRemaining} / {windowLimit} Energy
                                </div>
                              )}
                              <div className="mt-1 text-[11px] font-mono text-zinc-400 space-y-1">
                                {isFull ? (
                                  <div>Full charge ({windowLimit}/{windowLimit})</div>
                                ) : (
                                  <>
                                    <div className="text-[#c29b78] font-semibold flex items-center gap-1.5">
                                      <Zap className="w-3 h-3 fill-[#c29b78]/30 shrink-0" />
                                      <span>+1 in {formattedNextCharge}</span>
                                    </div>
                                    <div className="text-zinc-400 text-[10px]">
                                      Full charge in {recharge.hours}h {recharge.minutes}m {recharge.seconds}s
                                    </div>
                                  </>
                                )}
                              </div>
                            </div>

                            {puzzlesRemaining <= 12 && (
                              <button
                                type="button"
                                onClick={() => {
                                  setIsBatteryMenuOpen(false);
                                  setIsRewardedAdOpen(true);
                                }}
                                className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-[#c29b78]/15 hover:bg-[#c29b78]/25 border border-[#c29b78]/40 text-[#c29b78] text-xs font-semibold transition-all cursor-pointer active:scale-95"
                              >
                                <Zap className="w-3.5 h-3.5 fill-[#c29b78]/20" />
                                <span>Watch Ad (+3 Puzzles)</span>
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => {
                                setIsBatteryMenuOpen(false);
                                setPaywallReason("quota");
                                setIsQuotaModalOpen(true);
                              }}
                              className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-gradient-to-r from-amber-400 to-[#c29b78] hover:from-amber-300 hover:to-[#dfba94] text-zinc-950 text-xs font-black uppercase tracking-wider shadow-sm transition-all cursor-pointer active:scale-95"
                            >
                              <Sparkles className="w-3.5 h-3.5" />
                              <span>Get Unlimited Charge</span>
                            </button>
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>
              )
            ) : null}

            {/* Leaderboard Rank Button */}
            <button
              onClick={() => setActiveTab("rank")}
              aria-label="Leaderboard rank"
              data-testid="header-rank-btn"
              className="w-7 h-7 rounded-full hover:bg-[#22201e] flex items-center justify-center text-[#a3a3a3] hover:text-[#c29b78] transition-colors cursor-pointer relative"
              title="Global Standings & Friends"
            >
              <Trophy className="w-3.5 h-3.5" />
              {isHydrated && incomingFriendRequestsCount > 0 && (
                <span
                  data-testid="header-friend-requests-dot"
                  className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full bg-[#c29b78] shadow-[0_0_6px_rgba(194,155,120,0.8)]"
                />
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Offline Mode Banner */}
      {isHydrated && !isOnline && (
        <div
          data-testid="offline-badge"
          className="fixed top-16 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-semibold backdrop-blur-md shadow-lg"
        >
          <WifiOff className="w-3.5 h-3.5" />
          <span>Offline Mode (Playing from Cache)</span>
        </div>
      )}

      {/* 2. Main Gameplay Canvas */}
      <main className="flex-1 flex flex-col relative w-full pt-14 pb-16 bg-[#151413] overflow-hidden overscroll-none touch-none select-none justify-between items-center">
        {/* Placement Calibration Banner */}
        {isHydrated && isCalibrating && (
          <div
            className="w-full mx-auto px-3 mt-2 mb-1 animate-in fade-in duration-200"
            style={{
              width: "min(calc(100vw - 24px), calc(100dvh - 230px), 520px)",
              maxWidth: "min(calc(100vw - 24px), calc(100dvh - 230px), 520px)",
            }}
          >
            <div className="p-3 rounded-xl bg-gradient-to-r from-[#22201e] to-[#2d2a28] border border-[#c29b78]/40 shadow-lg flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#c29b78] animate-ping" />
                  <span className="text-xs font-black text-[#c29b78] uppercase tracking-wider">
                    Placement Test | Puzzle {currentCalibrationStep} of 6
                  </span>
                </div>
                <span className="text-[10px] text-[#a3a3a3] font-mono">
                  Est: {currentElo} Elo
                </span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-[#151413] overflow-hidden flex gap-1">
                {Array.from({ length: 6 }).map((_, idx) => (
                  <div
                    key={idx}
                    className={`h-full flex-1 rounded-full transition-all duration-300 ${
                      idx < (userAccount?.calibrationStep ?? 0)
                        ? "bg-[#c29b78]"
                        : idx === (userAccount?.calibrationStep ?? 0)
                        ? "bg-[#c29b78]/50 animate-pulse"
                        : "bg-white/10"
                    }`}
                  />
                ))}
              </div>
              <p className="text-[10px] text-[#a3a3a3]">
                Solve accurately to balance tactical puzzle difficulty to your skill baseline.
              </p>
            </div>
          </div>
        )}

        {!currentPuzzle ? (
          <div
            className="w-full flex-1 flex flex-col justify-between items-center px-4 py-3 mx-auto"
            style={{
              width: "min(calc(100vw - 24px), calc(100dvh - 230px), 520px)",
              maxWidth: "min(calc(100vw - 24px), calc(100dvh - 230px), 520px)",
            }}
          >
            {/* Top skeleton */}
            <div className="w-full h-10 bg-[#22201e]/80 rounded-xl border border-white/5 animate-pulse" />

            {/* Center chessboard skeleton */}
            <div className="w-full aspect-square bg-[#22201e] rounded-xl border border-white/5 animate-pulse my-2 flex flex-col items-center justify-center gap-3 shadow-2xl">
              <RefreshCw className="w-8 h-8 text-[#c29b78] animate-spin" />
              <div className="text-xs text-[#a3a3a3] font-semibold tracking-wider uppercase">
                Preparing next puzzle...
              </div>
            </div>

            {/* Bottom tactical card skeleton */}
            <div className="w-full h-14 bg-[#22201e]/80 rounded-xl border border-white/5 animate-pulse" />
          </div>
        ) : (
          <div className="w-full flex-1 flex flex-col items-center justify-between touch-none overscroll-none overflow-hidden">
            {showReelAd && !isPro ? (
              <ReelAdCard
                isPro={isPro}
                onContinue={() => goToNextPuzzle(true)}
                onUpgradeToPro={() => {
                  setPaywallReason("quota");
                  setIsQuotaModalOpen(true);
                }}
              />
            ) : (
              <PuzzleCard
                key={`${currentPuzzle.instanceId || currentPuzzle.id}-${currentIndex}`}
                puzzle={currentPuzzle}
                instanceId={currentPuzzle.instanceId}
                status={puzzleStatus}
                savedState={currentPuzzle ? puzzleStates[currentPuzzle.instanceId || currentPuzzle.id] : undefined}
                onSavePuzzleState={handleSavePuzzleState}
                isAlreadyRated={currentPuzzle ? getIsPuzzleAlreadyRated(currentPuzzle) : false}
                ratedPuzzleIds={ratedPuzzleIds}
                puzzleRatingHistory={puzzleRatingHistory}
                onMarkRated={markPuzzleRated}
                currentElo={currentElo}
                userId={userAccount?.id}
                guestId={userAccount?.id || guestId}
                streak={dailyStreak}
                combo={combo}
                canPlay={canPlay || puzzlesRemaining > 0}
                isPaywallOpen={isQuotaModalOpen}
                lastEloChange={lastEloChange}
                isCalibration={isCalibrating}
                calibrationStep={currentCalibrationStep}
                mode="ranked"
                isPro={isPro}
                canGoPrev={currentIndex > 0}
                currentIndex={currentIndex}
                slideDirection={slideDirection}
                onModeChange={(m) => {
                  if (m === "practice") {
                    if (!isPro) {
                      setPaywallReason("practice");
                      setIsQuotaModalOpen(true);
                    } else {
                      router.push("/practice");
                    }
                  }
                }}
                onStatusChange={handleStatusChange}
                onEloUpdate={handleEloUpdate}
                onEloPayout={processEloResult}
                onNextPuzzle={goToNextPuzzle}
                onPrevPuzzle={goToPrevPuzzle}
                onOpenStats={() => setIsStatsModalOpen(true)}
              />
            )}
          </div>
        )}
      </main>

      {/* Floating Out of Energy HUD Bar Docked Cleanly Above Bottom Nav */}
      {isHydrated && puzzlesRemaining <= 0 && !isPro && !isCalibrating && activeTab === "reels" && (
        <aside
          role="status"
          aria-label="Energy Depleted"
          data-testid="quota-depleted-hud"
          className="fixed bottom-14 left-1/2 -translate-x-1/2 z-30 w-full max-w-[480px] px-3 py-1.5 animate-in fade-in slide-in-from-bottom-2 duration-200"
        >
          <div
            data-testid="quota-depleted-banner"
            className="h-11 rounded-lg bg-[#12100e]/95 backdrop-blur-md border border-[#c29b78]/25 px-3 flex items-center justify-between gap-2 shadow-[0_-8px_24px_rgba(0,0,0,0.6)]"
          >
            {/* Left side */}
            <div className="flex items-center gap-1.5 min-w-0">
              <svg
                viewBox="0 0 24 24"
                className="w-3.5 h-3.5 stroke-rose-400 stroke-[2] fill-none shrink-0"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M13 2 L3 14 h9 l-1 8 10-12 h-9 l1-8 z" />
              </svg>
              <span className="text-[11px] font-semibold text-zinc-100 whitespace-nowrap">
                0/15 Energy
              </span>
              <span className="text-[11px] font-mono text-zinc-400 tracking-tight truncate flex items-center gap-1">
                <span className="w-1 h-1 rounded-full bg-zinc-500 shrink-0 inline-block" aria-hidden="true" />
                <span className="text-[#c29b78] font-semibold">+1 in {formattedNextCharge}</span>
              </span>
            </div>

            {/* Right side */}
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                data-testid="hud-watch-ad-btn"
                onClick={() => setIsRewardedAdOpen(true)}
                className="h-7 px-2.5 rounded-md bg-white/[0.04] hover:bg-white/[0.08] active:scale-[0.97] border border-white/[0.1] text-zinc-200 text-[11px] font-medium flex items-center gap-1 transition-all cursor-pointer"
              >
                <svg
                  viewBox="0 0 24 24"
                  className="w-2.5 h-2.5 fill-[#c29b78] stroke-none shrink-0"
                  aria-hidden="true"
                >
                  <polygon points="6 3 20 12 6 21 6 3" />
                </svg>
                <span>+3 Free</span>
              </button>

              <button
                type="button"
                data-testid="hud-upgrade-pro-btn"
                onClick={() => {
                  setPaywallReason("quota");
                  setIsQuotaModalOpen(true);
                }}
                className="h-7 px-2.5 rounded-md bg-[#c29b78] hover:bg-[#d1ab88] active:scale-[0.97] text-[#0a0908] text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer"
              >
                <svg
                  viewBox="0 0 24 24"
                  className="w-3 h-3 stroke-[#0a0908] stroke-[2.2] fill-none shrink-0"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M18.178 8c5.096 0 5.096 8 0 8-5.095 0-7.133-8-12.739-8-4.585 0-4.585 8 0 8 5.606 0 7.644-8 12.74-8z" />
                </svg>
                <span>PRO</span>
              </button>
            </div>
          </div>
        </aside>
      )}

      {/* 3. Modals & Drawers */}
      <LeaderboardModal
        isOpen={activeTab === "rank"}
        onClose={() => setActiveTab("reels")}
        currentElo={currentElo}
        streak={streak}
        guestId={guestId}
        userAccount={userAccount}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        onIncomingRequestsCountChange={setIncomingFriendRequestsCount}
      />

      <ProfileModal
        isOpen={activeTab === "profile"}
        onClose={() => setActiveTab("reels")}
        currentElo={currentElo}
        streak={dailyStreak}
        dailyStreak={dailyStreak}
        streakFreezes={streakFreezes}
        solveStreak={combo}
        guestId={guestId}
        userAccount={userAccount}
        onOpenAuth={() => {
          setAuthModalTab("register");
          setIsAuthModalOpen(true);
        }}
        onOpenLanding={() => router.push("/about")}
        onSignOut={handleSignOut}
        onResetElo={handleResetElo}
        onOpenUpgrade={() => {
          setActiveTab("reels");
          setPaywallReason("quota");
          setIsQuotaModalOpen(true);
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
        streakFreezes={streakFreezes}
        combo={combo}
        bestCombo={bestCombo}
        totalSolved={totalSolved}
        totalFailed={totalFailed}
      />

      {/* Rewarded Ad Modal (+3 puzzles) */}
      <RewardedAdModal
        isOpen={isRewardedAdOpen}
        onClose={() => setIsRewardedAdOpen(false)}
        onRewardEarned={(data) => {
          applyBonusRecharge(data.puzzlesRemaining, data.nextQuotaRefillTime);
          const existing = getStoredUserStats();
          saveUserStatsSync({
            ...existing,
            puzzlesRemaining: data.puzzlesRemaining,
            nextQuotaRefillTime: data.nextQuotaRefillTime || null,
          });
        }}
        userId={userAccount?.id}
        currentPuzzlesRemaining={puzzlesRemaining}
      />

      {/* 5. Free Tier Quota Paywall Modal (15 puzzles per 4h window) */}
      <QuotaPaywallModal
        isOpen={isQuotaModalOpen}
        onClose={() => {
          setIsQuotaModalOpen(false);
          const userCanPlay = canPlay || puzzlesRemaining > 0;
          if (!userCanPlay && puzzlesRemaining <= 0 && !isPro && !isCalibrating) {
            if (!currentPuzzle) {
              const lastSolvedRaw =
                typeof window !== "undefined"
                  ? window.localStorage.getItem("chess_reel_last_solved_puzzle")
                  : null;
              if (lastSolvedRaw) {
                try {
                  const p = JSON.parse(lastSolvedRaw);
                  setQueue((prev) => [ensurePuzzleInstanceId(p), ...prev]);
                  setCurrentIndex(0);
                  setPuzzleStatus("solved");
                } catch {}
              }
            }
          } else {
            setPuzzleStatus("playing");
            goToNextPuzzle();
          }
        }}
        onUpgradeComplete={async () => {
          await refreshSubscription();
          setIsQuotaModalOpen(false);
          setPuzzleStatus("playing");
          if (paywallReason === "quota") goToNextPuzzle();
        }}
        userId={userAccount?.id}
        resetsInMs={resetsInMs}
        limit={windowLimit}
        windowHours={windowHours}
        reason={paywallReason}
        onWatchAd={() => {
          setIsRewardedAdOpen(true);
        }}
      />
    </div>
  );
}

export default PlayView;
