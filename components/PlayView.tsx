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
} from "@/components/PuzzleCard";
import { LeaderboardModal } from "@/components/LeaderboardModal";
import { ProfileModal } from "@/components/ProfileModal";
import { AuthModal } from "@/components/AuthModal";
import { LandingPage } from "@/components/LandingPage";
import { CalibrationCompleteModal } from "@/components/CalibrationCompleteModal";
import { StatsModal } from "@/components/StatsModal";
import { UserAvatar } from "@/components/UserAvatar";
import { AdModal } from "@/components/AdModal";
import { QuotaPaywallModal } from "@/components/QuotaPaywallModal";
import { popNextPuzzle, prefetchPuzzles } from "@/lib/puzzleCache";
import { useStreak } from "@/lib/useStreak";
import { useTierQuota } from "@/lib/useTierQuota";
import { RefreshCw, WifiOff, UserPlus, BarChart2, Trophy, Zap, Flame, Crown, Sparkles } from "lucide-react";

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
  plan?: string;
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

export function PlayView({
  initialShowLanding = false,
}: {
  initialShowLanding?: boolean;
} = {}) {
  const router = useRouter();
  const [guestId, setGuestId] = useState<string>("guest-user");
  const [currentElo, setCurrentElo] = useState<number>(800);
  const [lastEloChange, setLastEloChange] = useState<number | null>(null);
  const [currentPuzzle, setCurrentPuzzle] = useState<PuzzleData | null>(
    FALLBACK_PUZZLES[0]
  );
  const [puzzleStatus, setPuzzleStatus] = useState<PuzzleStatus>("playing");
  const [streak, setStreak] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<"reels" | "rank" | "profile">("reels");

  // Account, Friends & Placement Calibration States
  const [userAccount, setUserAccount] = useState<UserAccount | null>(null);
  const [showLanding, setShowLanding] = useState<boolean>(initialShowLanding);
  const [authModalTab, setAuthModalTab] = useState<"register" | "login">("register");
  const [authModalGoogle, setAuthModalGoogle] = useState<boolean>(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [isCalibratedModalOpen, setIsCalibratedModalOpen] = useState<boolean>(false);
  const [calibratedFinalElo, setCalibratedFinalElo] = useState<number>(800);
  const [isStatsModalOpen, setIsStatsModalOpen] = useState<boolean>(false);
  const [oauthAlert, setOauthAlert] = useState<string | null>(null);

  // Daily streak, solve combo & puzzle totals tracking
  const {
    dailyStreak,
    combo,
    bestCombo,
    totalSolved,
    totalFailed,
    recordPuzzlePlay,
  } = useStreak();

  // Tier Quota & Ad Rules: Free: 4 puzzles / 4h, Ads every 2 puzzles; Pro: Unlimited & 0 Ads
  const {
    isPro,
    canPlay,
    puzzlesRemaining,
    windowLimit,
    windowHours,
    adFrequency,
    proPrice,
    annualDiscountPercent,
    resetsInMs,
    isAdOpen,
    isQuotaModalOpen,
    setIsAdOpen,
    setIsQuotaModalOpen,
    recordPuzzlePlayed,
    upgradeToPro,
  } = useTierQuota(userAccount?.id || guestId, userAccount?.plan);

  const [paywallReason, setPaywallReason] = useState<"quota" | "practice">("quota");

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
    window.addEventListener("open-quota-paywall", handleOpenPaywall);
    window.addEventListener("open-auth-modal", handleOpenAuth);
    return () => {
      window.removeEventListener("open-quota-paywall", handleOpenPaywall);
      window.removeEventListener("open-auth-modal", handleOpenAuth);
    };
  }, [setIsQuotaModalOpen]);

  const fallbackIndexRef = useRef<number>(0);
  const currentEloRef = useRef<number>(currentElo);

  useEffect(() => {
    currentEloRef.current = currentElo;
  }, [currentElo]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      (window as any).__triggerAdModal = () => setIsAdOpen(true);
      (window as any).__triggerQuotaModal = () => setIsQuotaModalOpen(true);
    }
  }, [setIsAdOpen, setIsQuotaModalOpen]);

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

  const [hasMounted, setHasMounted] = useState<boolean>(false);

  useEffect(() => {
    setHasMounted(true);
    const handleAccountSync = () => {
      try {
        const raw = window.localStorage.getItem(ACCOUNT_STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          setUserAccount(parsed);
          if (parsed.elo) setCurrentElo(parsed.elo);
        }
      } catch {}
    };
    window.addEventListener("account-updated", handleAccountSync);
    return () => window.removeEventListener("account-updated", handleAccountSync);
  }, []);

  // Initialize persistent guest ID, saved account, and saved Elo from localStorage
  // Sync landing visibility to hide/show dock
  useEffect(() => {
    if (typeof window !== "undefined") {
      const isLanding = showLanding || (!userAccount && hasMounted);
      window.dispatchEvent(
        new CustomEvent("landing-visibility", {
          detail: { visible: isLanding },
        })
      );
    }
  }, [showLanding, userAccount, hasMounted]);

  useEffect(() => {
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
              if (oauthUser && oauthUser.id) {
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
                if (oauthUser.elo) setCurrentElo(oauthUser.elo);
                setShowLanding(false);
                window.dispatchEvent(new Event("account-updated"));
                if (window.location.search.includes("google_auth=success")) {
                  window.history.replaceState({}, document.title, window.location.pathname);
                }
              }
            } catch (err) {
              console.warn("Could not parse OAuth user cookie:", err);
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
                    if (data.user.plan) {
                      window.localStorage.setItem("chess_reel_plan", data.user.plan);
                      window.dispatchEvent(new Event("plan-updated"));
                    }
                  }
                })
                .catch(() => {});
            }
          } catch {}
        } else {
          setShowLanding(true);
        }
      } catch (e) {
        console.warn("Storage access restricted:", e);
      }
  }, []);

  // Fetch next puzzle: checks local buffer queue first, falls back to API.
  const fetchNextPuzzle = useCallback(async () => {
    // If free user has exhausted their quota window, block advance and show paywall (placement test exempt)
    if (!canPlay && !isPro && !isCalibrating) {
      setPaywallReason("quota");
      setIsQuotaModalOpen(true);
      return;
    }

    setPuzzleStatus("loading");
    const elo = currentEloRef.current;
    const targetUserId = userAccount?.id || guestId;

    // 1. Check local prefetch queue (Offline buffer)
    const cachedPuzzle = popNextPuzzle();
    if (cachedPuzzle) {
      setCurrentPuzzle(cachedPuzzle);
      setPuzzleStatus("playing");
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
        setPuzzleStatus("playing");
        prefetchPuzzles(elo, 5, targetUserId).catch(() => {});
      } else {
        console.warn("No puzzle returned from API, using curated fallback.");
        const fallback =
          FALLBACK_PUZZLES[fallbackIndexRef.current % FALLBACK_PUZZLES.length];
        fallbackIndexRef.current += 1;
        setCurrentPuzzle(fallback);
        setPuzzleStatus("playing");
      }
    } catch (err) {
      console.error("Failed to fetch next puzzle from API:", err);
      const fallback =
        FALLBACK_PUZZLES[fallbackIndexRef.current % FALLBACK_PUZZLES.length];
      fallbackIndexRef.current += 1;
      setCurrentPuzzle(fallback);
      setPuzzleStatus("playing");
    }
  }, [userAccount?.id, guestId, canPlay, isPro, isCalibrating, setIsQuotaModalOpen]);

  // Initial puzzle fetch on mount
  const initialFetchDoneRef = useRef(false);
  useEffect(() => {
    if (!initialFetchDoneRef.current) {
      initialFetchDoneRef.current = true;
      if (!canPlay && !isPro && !isCalibrating) {
        // Free user paywalled on mount/refresh: show previous solved puzzle and do not advance
        const lastSolvedRaw =
          typeof window !== "undefined"
            ? window.localStorage.getItem("chess_reel_last_solved_puzzle")
            : null;
        if (lastSolvedRaw) {
          try {
            const parsed = JSON.parse(lastSolvedRaw);
            setCurrentPuzzle(parsed);
          } catch {
            setCurrentPuzzle(FALLBACK_PUZZLES[0]);
          }
        } else {
          setCurrentPuzzle(FALLBACK_PUZZLES[0]);
        }
        setPuzzleStatus("solved");
        setPaywallReason("quota");
        setIsQuotaModalOpen(true);
        return;
      }

      fetchNextPuzzle();
      prefetchPuzzles(currentEloRef.current, 5, userAccount?.id || guestId).catch(() => {});
    }
  }, [fetchNextPuzzle, userAccount?.id, guestId, canPlay, isPro, isCalibrating]);

  // Handle Elo update and placement test logic
  const handleEloUpdate = (newElo: number, change: number, isWin?: boolean) => {
    const won = isWin !== undefined ? isWin : change > 0;
    recordPuzzlePlay(won ? "win" : "loss");

    if (won && currentPuzzle) {
      try {
        if (typeof window !== "undefined") {
          window.localStorage.setItem("chess_reel_last_solved_puzzle", JSON.stringify(currentPuzzle));
        }
      } catch {}
    }

    // 1. Placement Calibration Mode (Quota and Ads do NOT count during placement!)
    if (userAccount && !userAccount.isCalibrated) {
      // Balanced placement calibration deltas: smooth progression
      const calibrationDeltas = [80, 70, 60, 50, 45, 35];
      const stepIndex = userAccount.calibrationStep ?? 0;
      const isWin = change > 0;
      const stepDelta = isWin
        ? calibrationDeltas[stepIndex] || 35
        : -Math.round((calibrationDeltas[stepIndex] || 35) * 0.75);

      // Balanced cap: new players during 6-step placement settle realistically between 500 and 1450
      const nextElo = Math.max(500, Math.min(1450, currentElo + stepDelta));
      const nextStep = stepIndex + 1;

      setCurrentElo(nextElo);
      setLastEloChange(stepDelta);

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

      fetchNextPuzzle();
      return;
    }

    // 2. Continuous Ranked Play: Free Tier Quota (4 puzzles / 4h) and Ads (every 2 puzzles) start HERE
    const { shouldShowAd, quotaReached } = recordPuzzlePlayed(change > 0);

    // Standard Continuous Reel Mode
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
        document.cookie = `chess_reel_session=${encodeURIComponent(user.id)}; path=/; max-age=${60 * 60 * 24 * 30}`;
        window.localStorage.setItem(ACCOUNT_STORAGE_KEY, JSON.stringify(user));
        window.localStorage.setItem(ELO_STORAGE_KEY, (user.elo || 800).toString());
        if (user.plan) {
          window.localStorage.setItem("chess_reel_plan", user.plan);
          window.dispatchEvent(new Event("plan-updated"));
        }
        window.dispatchEvent(new Event("account-updated"));
      }
    } catch {}

    fetchNextPuzzle();
  };

  // Sign out handler
  const handleSignOut = () => {
    setUserAccount(null);
    setShowLanding(true);
    setIsStatsModalOpen(false);
    try {
      if (typeof window !== "undefined") {
        window.localStorage.removeItem(ACCOUNT_STORAGE_KEY);
        window.localStorage.removeItem("chess_reel_preview_guest");
        window.localStorage.removeItem("chess_reel_plan");
        window.localStorage.removeItem("chess_reel_custom_dp");
        document.cookie = "chess_reel_session=; path=/; max-age=0";
        document.cookie = "chess_reel_oauth_user=; path=/; max-age=0";
        window.dispatchEvent(new Event("account-updated"));
        window.dispatchEvent(new Event("plan-updated"));
      }
    } catch {}
    setActiveTab("reels");
    router.push("/");
  };

  if (showLanding || (!userAccount && hasMounted)) {
    return (
      <>
        {oauthAlert && (
          <div className="fixed top-16 inset-x-0 z-50 p-3 max-w-md mx-auto animate-in slide-in-from-top-2 duration-200">
            <div className="p-3 rounded-xl bg-[#22201e] border border-[#c29b78]/40 text-[#f5f5f5] text-xs flex items-start justify-between gap-2 shadow-2xl">
              <div className="flex items-start gap-2">
                <span className="material-symbols-outlined text-[#c29b78] text-base shrink-0 mt-0.5">info</span>
                <span>{oauthAlert}</span>
              </div>
              <button
                onClick={() => setOauthAlert(null)}
                className="text-[#c29b78] hover:text-white shrink-0 font-bold text-sm px-1 cursor-pointer"
                aria-label="Dismiss notification"
              >
                ✕
              </button>
            </div>
          </div>
        )}
        <LandingPage
          onContinueWithGoogle={() => {
            const returnUrl = encodeURIComponent("/play");
            window.location.href = `/api/auth/google?guestId=${encodeURIComponent(guestId)}&returnUrl=${returnUrl}`;
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
    <div className="bg-[#151413] font-sans text-[#f5f5f5] flex flex-col min-h-screen selection:bg-[#c29b78] selection:text-[#151413] overflow-x-hidden overscroll-none w-full">
      {oauthAlert && (
        <div className="fixed top-16 inset-x-0 z-50 p-3 max-w-md mx-auto animate-in slide-in-from-top-2 duration-200">
          <div className="p-3 rounded-xl bg-[#22201e] border border-[#c29b78]/40 text-[#f5f5f5] text-xs flex items-start justify-between gap-2 shadow-2xl">
            <div className="flex items-start gap-2">
              <span className="material-symbols-outlined text-[#c29b78] text-base shrink-0 mt-0.5">info</span>
              <span>{oauthAlert}</span>
            </div>
            <button
              onClick={() => setOauthAlert(null)}
              className="text-[#c29b78] hover:text-white shrink-0 font-bold text-sm px-1 cursor-pointer"
              aria-label="Dismiss notification"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* 1. Fixed Top Header */}
      <header className="fixed top-0 inset-x-0 z-40 bg-[#0f0e0d]/92 backdrop-blur-xl pt-safe border-b border-white/[0.06]">
        <div className="h-14 px-3.5 max-w-md mx-auto flex items-center justify-between gap-2">
          {/* Brand Logo & Title */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-base text-[#c29b78]">♟</span>
            <span className="font-black text-sm tracking-tight text-[#f5f5f5]">
              Doom<span className="text-[#c29b78]">Chess</span>
            </span>
            {hasMounted && isCalibrating && (
              <span className="text-[9px] tracking-wider uppercase text-[#c29b78] font-bold px-1.5 py-0.5 rounded bg-[#c29b78]/15 border border-[#c29b78]/30">
                {currentCalibrationStep}/6
              </span>
            )}
          </div>

          {/* Flush HUD: Rating • Streak • Quota/Pro • Leaderboard (NO rounded pills) */}
          <div suppressHydrationWarning className="flex items-center gap-3 sm:gap-3.5 shrink-0">
            {/* Flush Rating */}
            <div
              data-testid="rating-pill"
              suppressHydrationWarning
              className="flex items-center gap-1 font-bold text-xs text-[#c29b78]"
              title={`Your Rating: ${currentElo}`}
            >
              <Zap className="w-3.5 h-3.5 text-[#c29b78] fill-[#c29b78]" />
              <span suppressHydrationWarning className="tracking-tight">{currentElo}</span>
              {lastEloChange !== null && (
                <span
                  suppressHydrationWarning
                  className={`text-[10px] font-black ${
                    lastEloChange >= 0 ? "text-[#10b981]" : "text-[#ef4444]"
                  }`}
                >
                  {lastEloChange >= 0 ? `+${lastEloChange}` : lastEloChange}
                </span>
              )}
            </div>

            {/* Flush Daily Streak */}
            <div
              data-testid="header-streak-indicator"
              suppressHydrationWarning
              className="flex items-center gap-1 font-bold text-xs text-amber-400"
              title={`Daily Streak: ${dailyStreak} ${dailyStreak === 1 ? "day" : "days"}`}
            >
              <span className="sr-only">🔥</span>
              <svg
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="w-3.5 h-3.5 shrink-0"
                aria-hidden="true"
              >
                <path
                  d="M12 2C10.5 4.5 9 6.8 9 9.5C9 10.2 9.15 10.87 9.42 11.48C8.5 10.82 8 9.73 8 8.5C5.5 10.5 4 13.5 4 16.5C4 20.09 7.13 23 11 23C16 23 20 19.42 20 15C20 10.5 16.5 6 12 2Z"
                  fill="url(#headerFireGrad)"
                />
                <path
                  d="M11.5 13C10.8 14 10.2 15.2 10.2 16.5C10.2 18.4 11.8 20 13.8 20C14.9 20 15.9 19.5 16.5 18.7C16.3 16.6 14.7 15 13.3 13.8C12.7 13.3 12 12.9 11.5 13Z"
                  fill="#fef08a"
                  opacity="0.95"
                />
                <defs>
                  <linearGradient id="headerFireGrad" x1="12" y1="2" x2="12" y2="23" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#fef08a" />
                    <stop offset="40%" stopColor="#f59e0b" />
                    <stop offset="100%" stopColor="#d97706" />
                  </linearGradient>
                </defs>
              </svg>
              <span suppressHydrationWarning>{dailyStreak}</span>
            </div>

            {/* Flush Solve Combo */}
            {hasMounted && combo >= 2 && (
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

            {/* Flush Free Tier Quota, Calibration, or PRO Indicator */}
            {!hasMounted ? (
              <button
                data-testid="header-quota-btn"
                suppressHydrationWarning
                className="flex items-center gap-1 text-[11px] font-bold transition-all cursor-pointer opacity-80"
                aria-label="View free puzzle quota"
              >
                <span className="text-amber-400">⚡</span>
                <span className="font-mono text-zinc-200">
                  {puzzlesRemaining}/{windowLimit}
                </span>
              </button>
            ) : isPro ? (
              <div
                suppressHydrationWarning
                className="flex items-center gap-1 text-[11px] font-black text-amber-300"
                title="Pro Member: Unlimited Puzzles & 0 Ads"
                data-testid="header-pro-badge"
              >
                <span>👑 PRO</span>
              </div>
            ) : isCalibrating ? (
              <div
                suppressHydrationWarning
                className="flex items-center gap-1 text-[11px] font-bold text-[#c29b78]"
                title={`Placement Calibration: Puzzle ${currentCalibrationStep} of 6 (Quota starts after placement)`}
                data-testid="header-calibration-badge"
              >
                <span>🎯 {currentCalibrationStep}/6</span>
              </div>
            ) : (
              <button
                onClick={() => {
                  setPaywallReason("quota");
                  setIsQuotaModalOpen(true);
                }}
                data-testid="header-quota-btn"
                suppressHydrationWarning
                className="flex items-center gap-1 text-[11px] font-bold transition-all cursor-pointer active:scale-95"
                title={`Free Quota: ${puzzlesRemaining}/${windowLimit} puzzles remaining this ${windowHours}h window. Tap for details.`}
                aria-label="View free puzzle quota"
              >
                <span className={puzzlesRemaining > 0 ? "text-amber-400" : "text-rose-400"}>⚡</span>
                <span suppressHydrationWarning className={`font-mono ${puzzlesRemaining > 0 ? "text-zinc-200" : "text-rose-400 font-bold"}`}>
                  {puzzlesRemaining}/{windowLimit}
                </span>
              </button>
            )}

            {/* Leaderboard Rank Button */}
            <button
              onClick={() => setActiveTab("rank")}
              aria-label="Leaderboard rank"
              data-testid="header-rank-btn"
              className="w-7 h-7 rounded-full hover:bg-[#22201e] flex items-center justify-center text-[#a3a3a3] hover:text-[#c29b78] transition-colors cursor-pointer"
              title="Global Standings & Friends"
            >
              <Trophy className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* Offline Mode Banner */}
      {hasMounted && !isOnline && (
        <div
          data-testid="offline-badge"
          className="fixed top-16 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-semibold backdrop-blur-md shadow-lg"
        >
          <WifiOff className="w-3.5 h-3.5" />
          <span>Offline Mode (Playing from Cache)</span>
        </div>
      )}

      {/* 2. Main Gameplay Canvas */}
      <main className="flex flex-col relative w-full pt-14 pb-20 bg-[#151413] min-h-[calc(100dvh-3.5rem)] overflow-x-hidden overscroll-none">
        {/* Placement Calibration Banner */}
        {hasMounted && isCalibrating && (
          <div className="w-full max-w-sm mx-auto px-3 mt-2 mb-1 animate-in fade-in duration-200">
            <div className="p-3 rounded-xl bg-gradient-to-r from-[#22201e] to-[#2d2a28] border border-[#c29b78]/40 shadow-lg flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#c29b78] animate-ping" />
                  <span className="text-xs font-black text-[#c29b78] uppercase tracking-wider">
                    Placement Test • Puzzle {currentCalibrationStep} of 6
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
          <div className="w-full flex-1 flex flex-col justify-between items-center px-4 py-3 max-w-sm mx-auto">
            {/* Top skeleton */}
            <div className="w-full h-12 bg-[#22201e]/80 rounded-xl border border-white/5 animate-pulse" />

            {/* Center chessboard skeleton */}
            <div className="w-full aspect-square bg-[#22201e] rounded-xl border border-white/5 animate-pulse my-4 flex flex-col items-center justify-center gap-3 shadow-2xl">
              <RefreshCw className="w-8 h-8 text-[#c29b78] animate-spin" />
              <div className="text-xs text-[#a3a3a3] font-semibold tracking-wider uppercase">
                Preparing next reel...
              </div>
            </div>

            {/* Bottom tactical card skeleton */}
            <div className="w-full h-16 bg-[#22201e]/80 rounded-xl border border-white/5 animate-pulse" />
          </div>
        ) : (
          <div className="w-full flex-1 flex flex-col items-center justify-between">
            {/* Free Tier Quota Exhausted Banner with Refill Countdown & Upgrade CTA */}
            {hasMounted && !canPlay && !isPro && !isCalibrating && (
              <div className="w-full max-w-sm mx-auto px-3 mt-1.5 mb-1 animate-in fade-in slide-in-from-top-1 duration-200">
                <div
                  data-testid="quota-depleted-banner"
                  onClick={() => {
                    setPaywallReason("quota");
                    setIsQuotaModalOpen(true);
                  }}
                  className="p-2.5 rounded-xl bg-gradient-to-r from-[#22201e] via-[#2a241d] to-[#22201e] border border-amber-500/40 shadow-lg flex items-center justify-between gap-2 cursor-pointer hover:border-amber-500/70 transition-all active:scale-98"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-amber-400 text-sm shrink-0">⚡</span>
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-black text-white">Daily Limit Reached</span>
                        <span className="text-[10px] text-amber-400 font-mono font-bold">
                          (0/{windowLimit})
                        </span>
                      </div>
                      <span className="text-[10px] text-zinc-400 truncate font-mono">
                        Refill in {Math.floor(resetsInMs / 3600000)}h {Math.floor((resetsInMs % 3600000) / 60000)}m • Solved puzzle shown
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setPaywallReason("quota");
                      setIsQuotaModalOpen(true);
                    }}
                    className="px-2.5 py-1.5 rounded-lg bg-gradient-to-r from-amber-400 to-[#c29b78] hover:from-amber-300 hover:to-[#dfba94] text-zinc-950 text-[10px] font-black uppercase tracking-wider shrink-0 flex items-center gap-1 shadow-sm cursor-pointer"
                  >
                    <Crown className="w-3 h-3 text-zinc-950" />
                    <span>Pro</span>
                  </button>
                </div>
              </div>
            )}
            <PuzzleCard
              key={currentPuzzle.id}
              puzzle={currentPuzzle}
              status={puzzleStatus}
              currentElo={currentElo}
              guestId={userAccount?.id || guestId}
              streak={dailyStreak}
              combo={combo}
              canPlay={canPlay}
              lastEloChange={lastEloChange}
              isCalibration={isCalibrating}
              calibrationStep={currentCalibrationStep}
              mode="ranked"
              isPro={isPro}
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
              onStatusChange={setPuzzleStatus}
              onEloUpdate={handleEloUpdate}
              onNextPuzzle={fetchNextPuzzle}
              onOpenStats={() => setIsStatsModalOpen(true)}
            />
          </div>
        )}
      </main>

      {/* 3. Modals & Drawers */}
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
        streak={dailyStreak}
        dailyStreak={dailyStreak}
        solveStreak={combo}
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
        combo={combo}
        bestCombo={bestCombo}
        totalSolved={totalSolved}
        totalFailed={totalFailed}
      />

      {/* 4. Sponsored Ad Interstitial (Shown every 2 puzzles for free users) */}
      <AdModal
        isOpen={isAdOpen}
        onClose={() => {
          setIsAdOpen(false);
          if (!canPlay && !isPro) {
            setPaywallReason("quota");
            setIsQuotaModalOpen(true);
          } else {
            fetchNextPuzzle();
          }
        }}
        onUpgradeToPro={upgradeToPro}
        proPrice={proPrice}
      />

      {/* 5. Free Tier Quota Paywall Modal (4 puzzles per 4h window) */}
      <QuotaPaywallModal
        isOpen={isQuotaModalOpen}
        onClose={() => setIsQuotaModalOpen(false)}
        onUpgradeToPro={upgradeToPro}
        resetsInMs={resetsInMs}
        limit={windowLimit}
        windowHours={windowHours}
        adFrequency={adFrequency}
        proPrice={proPrice}
        annualDiscountPercent={annualDiscountPercent}
        reason={paywallReason}
      />
    </div>
  );
}

export default PlayView;
