"use client";

import { useState, useEffect, useCallback } from "react";
import {
  TierConfig,
  DEFAULT_TIER_CONFIG,
  isActiveProAccount,
  isProPlan,
  SubscriptionFields,
} from "./tierTypes";

export const PLAN_STORAGE_KEY = "chess_reel_plan";

export function getTierStorageKey(userId?: string): string {
  if (userId && !userId.startsWith("guest-")) {
    return `chess_reel_tier_session_${userId}`;
  }
  return "chess_reel_tier_session_guest";
}

function readStoredAccount(): SubscriptionFields | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem("chess_reel_account");
    return raw ? (JSON.parse(raw) as SubscriptionFields) : null;
  } catch {
    return null;
  }
}

/** Plan flag for the current user, including provider-backed Pro state. */
function resolveLocalPro(userPlan?: string | null): boolean {
  if (typeof window === "undefined") return isProPlan(userPlan);

  // The hydrated account object is authoritative; it carries the derived
  // `isPro` + `currentPeriodEnd` state from the server.
  const account = readStoredAccount();
  if (account) {
    return isActiveProAccount({
      ...account,
      plan: userPlan ?? account.plan,
    });
  }

  if (isProPlan(userPlan)) return true;
  return isProPlan(window.localStorage.getItem(PLAN_STORAGE_KEY));
}

export interface LocalTierSession {
  solveTimestamps: number[]; // epoch ms of solves in active window
  puzzlesSinceLastAd: number;
}

function getInitialTierState(effectivePro: boolean, userId?: string) {
  if (effectivePro) {
    return {
      puzzlesRemaining: 999999,
      canPlay: true,
      resetsInMs: 0,
      puzzlesSinceLastAd: 0,
    };
  }
  let activeConfig = DEFAULT_TIER_CONFIG;
  if (typeof window !== "undefined") {
    try {
      const rawCfg = window.localStorage.getItem("chess_reel_tier_config");
      if (rawCfg) {
        const parsed = JSON.parse(rawCfg);
        if (parsed.freePuzzleLimit && parsed.freePuzzleLimit < 15) {
          parsed.freePuzzleLimit = 15;
          window.localStorage.setItem("chess_reel_tier_config", JSON.stringify(parsed));
        }
        activeConfig = { ...DEFAULT_TIER_CONFIG, ...parsed, freePuzzleLimit: Math.max(15, parsed.freePuzzleLimit || 15) };
      }
    } catch {}
  }
  if (typeof window !== "undefined") {
    try {
      let cachedPuzzlesRemaining: number | undefined;
      try {
        const rawStats = window.localStorage.getItem("chessreels_user_stats_v1");
        if (rawStats) {
          const parsedStats = JSON.parse(rawStats);
          if (typeof parsedStats.puzzlesRemaining === "number") {
            cachedPuzzlesRemaining = parsedStats.puzzlesRemaining;
          }
        }
      } catch {}

      const storageKey = getTierStorageKey(userId);
      const raw = window.localStorage.getItem(storageKey) || window.localStorage.getItem("chess_reel_tier_session");
      if (raw) {
        const parsed: LocalTierSession = JSON.parse(raw);
        const now = Date.now();
        const windowMs = activeConfig.freeWindowHours * 3600 * 1000;
        const validTimestamps = (parsed.solveTimestamps || []).filter((t) => now - t < windowMs);
        let remaining = Math.max(0, activeConfig.freePuzzleLimit - validTimestamps.length);
        if (typeof cachedPuzzlesRemaining === "number") {
          remaining = Math.min(activeConfig.freePuzzleLimit, Math.max(remaining, cachedPuzzlesRemaining));
        }
        const canPlay = remaining > 0;
        let resetsInMs = 0;
        if (remaining === 0 && validTimestamps.length > 0) {
          const oldestTime = Math.min(...validTimestamps);
          resetsInMs = Math.max(0, oldestTime + windowMs - now);
        }
        return {
          puzzlesRemaining: remaining,
          canPlay,
          resetsInMs,
          puzzlesSinceLastAd: parsed.puzzlesSinceLastAd || 0,
        };
      } else if (typeof cachedPuzzlesRemaining === "number") {
        return {
          puzzlesRemaining: cachedPuzzlesRemaining,
          canPlay: cachedPuzzlesRemaining > 0,
          resetsInMs: 0,
          puzzlesSinceLastAd: 0,
        };
      }
    } catch {}
  }
  return {
    puzzlesRemaining: activeConfig.freePuzzleLimit,
    canPlay: true,
    resetsInMs: 0,
    puzzlesSinceLastAd: 0,
  };
}

export function useTierQuota(
  userId: string,
  userPlan?: string | null
) {
  const [config, setConfig] = useState<TierConfig>(DEFAULT_TIER_CONFIG);
  const [isPro, setIsPro] = useState<boolean>(() => resolveLocalPro(userPlan));

  const [puzzlesRemaining, setPuzzlesRemaining] = useState<number>(() => getInitialTierState(isPro, userId).puzzlesRemaining);
  const [puzzlesSinceLastAd, setPuzzlesSinceLastAd] = useState<number>(() => getInitialTierState(isPro, userId).puzzlesSinceLastAd);
  const [canPlay, setCanPlay] = useState<boolean>(() => getInitialTierState(isPro, userId).canPlay);
  const [resetsInMs, setResetsInMs] = useState<number>(() => getInitialTierState(isPro, userId).resetsInMs);
  const [resetsAt, setResetsAt] = useState<number>(0);
  const [isAdOpen, setIsAdOpen] = useState<boolean>(false);
  const [isQuotaModalOpen, setIsQuotaModalOpen] = useState<boolean>(false);

  // Sync isPro whenever userPlan or localStorage changes
  useEffect(() => {
    if (typeof window === "undefined") return;
    const syncPlan = () => {
      const effectivePro = resolveLocalPro(userPlan);
      setIsPro(effectivePro);
      if (effectivePro) {
        setPuzzlesRemaining(999999);
        setCanPlay(true);
        setResetsInMs(0);
      }
    };

    syncPlan();
    window.addEventListener("storage", syncPlan);
    window.addEventListener("plan-updated", syncPlan);
    return () => {
      window.removeEventListener("storage", syncPlan);
      window.removeEventListener("plan-updated", syncPlan);
    };
  }, [userPlan]);

  // Load live config from API on mount
  useEffect(() => {
    fetch("/api/tier/config", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.config) {
          setConfig(data.config);
          try {
            if (typeof window !== "undefined") {
              window.localStorage.setItem("chess_reel_tier_config", JSON.stringify(data.config));
            }
          } catch {}
        }
      })
      .catch(() => {});
  }, []);

  // Recalculate local window quota
  const recalculateQuota = useCallback(
    (timestamps: number[], currentConfig: TierConfig, effectivePro: boolean) => {
      if (effectivePro) {
        setPuzzlesRemaining(999999);
        setCanPlay(true);
        setResetsInMs(0);
        return;
      }

      const now = Date.now();
      const windowMs = currentConfig.freeWindowHours * 3600 * 1000;
      const validTimestamps = timestamps.filter((t) => now - t < windowMs);

      const remaining = Math.max(0, currentConfig.freePuzzleLimit - validTimestamps.length);
      setPuzzlesRemaining(remaining);
      setCanPlay(remaining > 0);

      if (remaining === 0 && validTimestamps.length > 0) {
        const oldestTime = Math.min(...validTimestamps);
        const resetAt = oldestTime + windowMs;
        setResetsInMs(Math.max(0, resetAt - now));
        setResetsAt(resetAt);
      } else if (remaining < currentConfig.freePuzzleLimit && validTimestamps.length > 0) {
        const oldestTime = Math.min(...validTimestamps);
        const resetAt = oldestTime + windowMs;
        setResetsInMs(Math.max(0, resetAt - now));
        setResetsAt(resetAt);
      } else {
        setResetsInMs(0);
        setResetsAt(Date.now());
      }
    },
    []
  );

  // Load and clean stored local session whenever userId, config, or isPro changes
  useEffect(() => {
    if (typeof window === "undefined") return;
    const storageKey = getTierStorageKey(userId);
    const syncSession = () => {
      try {
        const raw = window.localStorage.getItem(storageKey) || window.localStorage.getItem("chess_reel_tier_session");
        if (raw) {
          const parsed: LocalTierSession = JSON.parse(raw);
          setPuzzlesSinceLastAd(parsed.puzzlesSinceLastAd || 0);
          recalculateQuota(parsed.solveTimestamps || [], config, isPro);
        } else {
          setPuzzlesSinceLastAd(0);
          recalculateQuota([], config, isPro);
        }
      } catch {
        setPuzzlesSinceLastAd(0);
        recalculateQuota([], config, isPro);
      }
    };

    syncSession();
    window.addEventListener("tier-session-updated", syncSession);
    window.addEventListener("storage", syncSession);
    return () => {
      window.removeEventListener("tier-session-updated", syncSession);
      window.removeEventListener("storage", syncSession);
    };
  }, [userId, config, isPro, recalculateQuota]);

  // Sync authoritative quota from backend
  const syncWithServer = useCallback(async () => {
    if (!userId) return;
    try {
      const res = await fetch(`/api/tier/quota?userId=${encodeURIComponent(userId)}`, { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        if (data.config) setConfig(data.config);
        if (data.quota) {
          if (data.quota.isPro) {
            setIsPro(true);
            setPuzzlesRemaining(999999);
            setCanPlay(true);
            setResetsInMs(0);
            return;
          }

          const storageKey = getTierStorageKey(userId);
          const limit = Math.max(15, data.config?.freePuzzleLimit || data.quota.windowLimit || DEFAULT_TIER_CONFIG.freePuzzleLimit);
          const hours = data.config?.freeWindowHours || data.quota.windowHours || DEFAULT_TIER_CONFIG.freeWindowHours;
          const windowMs = hours * 3600 * 1000;
          const now = Date.now();

          let localValidTimestamps: number[] = [];
          try {
            if (typeof window !== "undefined") {
              const raw = window.localStorage.getItem(storageKey) || window.localStorage.getItem("chess_reel_tier_session");
              if (raw) {
                const parsed: LocalTierSession = JSON.parse(raw);
                localValidTimestamps = (parsed.solveTimestamps || []).filter((t) => now - t < windowMs);
              }
            }
          } catch {}

          // For registered accounts, server solve count in window is authoritative
          const used = userId.startsWith("guest-")
            ? Math.max(data.quota.usedInWindow || 0, localValidTimestamps.length)
            : (data.quota.usedInWindow !== undefined ? data.quota.usedInWindow : localValidTimestamps.length);

          const remaining = typeof data.quota.puzzlesRemaining === "number"
            ? data.quota.puzzlesRemaining
            : Math.max(0, limit - used);

          const effectiveCanPlay = remaining > 0;
          const resets = data.quota.resetsInMs || 0;
          const serverResetAt = typeof data.quota.resetsAt === "string"
            ? new Date(data.quota.resetsAt).getTime()
            : Date.now() + resets;

          setPuzzlesRemaining(remaining);
          setCanPlay(effectiveCanPlay);
          setResetsInMs(resets);
          setResetsAt(Number.isFinite(serverResetAt) ? serverResetAt : Date.now() + resets);

          // Update local tier timestamps so they stay aligned with server remaining
          try {
            if (typeof window !== "undefined") {
              const neededCount = Math.max(0, limit - remaining);
              const trimmedTimestamps = localValidTimestamps.slice(-neededCount);
              const sessionData: LocalTierSession = {
                solveTimestamps: trimmedTimestamps,
                puzzlesSinceLastAd: localValidTimestamps.length,
              };
              window.localStorage.setItem(storageKey, JSON.stringify(sessionData));
            }
          } catch {}
        }
      }
    } catch (e) {
      console.warn("Could not sync quota with server:", e);
    }
  }, [userId, isPro]);

  useEffect(() => {
    syncWithServer();
  }, [syncWithServer]);

  // Record a completed puzzle: checks quota & ad threshold (only for solved puzzles)
  const recordPuzzlePlayed = useCallback(
    (isWin: boolean, puzzleId?: string): { shouldShowAd: boolean; quotaReached: boolean } => {
      if (isPro) {
        return { shouldShowAd: false, quotaReached: false };
      }

      // Quota only counts for SOLVED puzzles. Failed or incomplete attempts do NOT consume quota.
      if (!isWin) {
        return { shouldShowAd: false, quotaReached: false };
      }

      void fetch("/api/tier/quota", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, puzzleId, result: "win" }),
      }).then(async (res) => {
        if (!res.ok) return;
        const data = await res.json();
        if (data.quota?.isPro) {
          setIsPro(true);
          setPuzzlesRemaining(999999);
          setCanPlay(true);
          setResetsInMs(0);
          setResetsAt(0);
          return;
        }
        if (data.quota) {
          const remaining = data.quota.puzzlesRemaining ?? puzzlesRemaining;
          setPuzzlesRemaining(remaining);
          setCanPlay(Boolean(data.quota.canPlay));
          setResetsInMs(data.quota.resetsInMs || 0);
          const resetAt = data.quota.resetsAt ? new Date(data.quota.resetsAt).getTime() : 0;
          setResetsAt(Number.isFinite(resetAt) ? resetAt : 0);
        }
      }).catch(() => {});

      const now = Date.now();
      const windowMs = config.freeWindowHours * 3600 * 1000;
      const storageKey = getTierStorageKey(userId);

      let timestamps: number[] = [];
      let nextAdCount = puzzlesSinceLastAd + 1;

      try {
        if (typeof window !== "undefined") {
          const raw = window.localStorage.getItem(storageKey);
          if (raw) {
            const parsed: LocalTierSession = JSON.parse(raw);
            timestamps = (parsed.solveTimestamps || []).filter((t) => now - t < windowMs);
          }
        }
      } catch {}

      // Add current puzzle solve timestamp
      timestamps.push(now);

      const remaining = Math.max(0, config.freePuzzleLimit - timestamps.length);
      const isQuotaDepleted = remaining === 0;

      setPuzzlesRemaining(remaining);
      setCanPlay(!isQuotaDepleted);
      setPuzzlesSinceLastAd(nextAdCount);

      if (isQuotaDepleted) {
        const oldestTime = Math.min(...timestamps);
        setResetsInMs(Math.max(0, oldestTime + windowMs - now));
      }

      // Persist to user-scoped localStorage
      try {
        if (typeof window !== "undefined") {
          const sessionData: LocalTierSession = {
            solveTimestamps: timestamps,
            puzzlesSinceLastAd: nextAdCount,
          };
          window.localStorage.setItem(storageKey, JSON.stringify(sessionData));
          window.dispatchEvent(new Event("tier-session-updated"));
        }
      } catch {}

      return {
        shouldShowAd: false,
        quotaReached: isQuotaDepleted,
      };
    },
    [userId, isPro, config, puzzlesSinceLastAd]
  );

  /**
   * Re-read the authenticated user's subscription state from the database after
   * a provider checkout (or dev activation) completes.
   */
  const refreshSubscription = useCallback(async () => {
    if (!userId) return;

    try {
      const res = await fetch(`/api/user/account?userId=${encodeURIComponent(userId)}`, { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        if (data?.user) {
          window.localStorage.setItem("chess_reel_account", JSON.stringify(data.user));

          const entitled = isActiveProAccount(data.user);
          window.localStorage.setItem(PLAN_STORAGE_KEY, entitled ? "premium" : "free");

          if (entitled) {
            window.localStorage.removeItem(getTierStorageKey(userId));
            setIsPro(true);
            setPuzzlesRemaining(999999);
            setCanPlay(true);
            setResetsInMs(0);
            setIsAdOpen(false);
            setIsQuotaModalOpen(false);
          } else {
            setIsPro(false);
          }

          window.dispatchEvent(new Event("plan-updated"));
          window.dispatchEvent(new Event("account-updated"));
          window.dispatchEvent(new Event("tier-session-updated"));
        }
      }
    } catch (err) {
      console.warn("Could not refresh subscription state:", err);
    }

    await syncWithServer();
  }, [userId, syncWithServer]);

  const applyBonusRecharge = useCallback((newRemaining: number, newResetAt?: string | null) => {
    setPuzzlesRemaining(newRemaining);
    setCanPlay(newRemaining > 0);
    if (newResetAt) {
      const parsed = new Date(newResetAt).getTime();
      if (Number.isFinite(parsed)) {
        setResetsAt(parsed);
        setResetsInMs(Math.max(0, parsed - Date.now()));
      }
    }

    // Keep local storage tier session timestamps in sync so refresh never reverts to 0
    if (typeof window !== "undefined") {
      try {
        const storageKey = getTierStorageKey(userId);
        const raw = window.localStorage.getItem(storageKey);
        const parsed: LocalTierSession = raw ? JSON.parse(raw) : { solveTimestamps: [], puzzlesSinceLastAd: 0 };
        const effectiveLimit = Math.max(15, config.freePuzzleLimit || 15);
        const targetUsed = Math.max(0, effectiveLimit - newRemaining);
        parsed.solveTimestamps = (parsed.solveTimestamps || []).slice(-targetUsed);
        window.localStorage.setItem(storageKey, JSON.stringify(parsed));
      } catch {}

      try {
        const rawStats = window.localStorage.getItem("chessreels_user_stats_v1");
        if (rawStats) {
          const parsed = JSON.parse(rawStats);
          parsed.puzzlesRemaining = newRemaining;
          if (newResetAt) parsed.nextQuotaRefillTime = newResetAt;
          window.localStorage.setItem("chessreels_user_stats_v1", JSON.stringify(parsed));
        }
      } catch {}
    }
  }, [userId, config.freePuzzleLimit]);

  return {
    isPro,
    canPlay,
    puzzlesRemaining,
    setPuzzlesRemaining,
    applyBonusRecharge,
    windowLimit: config.freePuzzleLimit,
    windowHours: config.freeWindowHours,
    adFrequency: config.adFrequencyPuzzles,
    proPrice: config.proMonthlyPrice,
    annualDiscountPercent: config.annualDiscountPercent,
    resetsInMs,
    resetsAt,
    isAdOpen,
    isQuotaModalOpen,
    setIsAdOpen,
    setIsQuotaModalOpen,
    recordPuzzlePlayed,
    refreshSubscription,
    // Backward-compatible alias. Entitlement itself only comes from a verified
    // provider webhook (or the development-only activation endpoint).
    upgradeToPro: refreshSubscription,
    syncWithServer,
  };
}
