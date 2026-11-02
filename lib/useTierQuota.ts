"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { TierConfig, DEFAULT_TIER_CONFIG, isProPlan } from "./tierTypes";

export const PLAN_STORAGE_KEY = "chess_reel_plan";

export function getTierStorageKey(userId?: string): string {
  if (userId && !userId.startsWith("guest-")) {
    return `chess_reel_tier_session_${userId}`;
  }
  return "chess_reel_tier_session_guest";
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
      if (rawCfg) activeConfig = { ...DEFAULT_TIER_CONFIG, ...JSON.parse(rawCfg) };
    } catch {}
  }
  if (typeof window !== "undefined") {
    try {
      const storageKey = getTierStorageKey(userId);
      const raw = window.localStorage.getItem(storageKey);
      if (raw) {
        const parsed: LocalTierSession = JSON.parse(raw);
        const now = Date.now();
        const windowMs = activeConfig.freeWindowHours * 3600 * 1000;
        const validTimestamps = (parsed.solveTimestamps || []).filter((t) => now - t < windowMs);
        const remaining = Math.max(0, activeConfig.freePuzzleLimit - validTimestamps.length);
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
  const [isPro, setIsPro] = useState<boolean>(() => {
    if (isProPlan(userPlan)) return true;
    if (typeof window !== "undefined") {
      const localPlan = window.localStorage.getItem(PLAN_STORAGE_KEY);
      if (isProPlan(localPlan)) return true;
      try {
        const acc = JSON.parse(window.localStorage.getItem("chess_reel_account") || "{}");
        if (isProPlan(acc?.plan)) return true;
      } catch {}
    }
    return false;
  });

  const [puzzlesRemaining, setPuzzlesRemaining] = useState<number>(() => getInitialTierState(isPro, userId).puzzlesRemaining);
  const [puzzlesSinceLastAd, setPuzzlesSinceLastAd] = useState<number>(() => getInitialTierState(isPro, userId).puzzlesSinceLastAd);
  const [canPlay, setCanPlay] = useState<boolean>(() => getInitialTierState(isPro, userId).canPlay);
  const [resetsInMs, setResetsInMs] = useState<number>(() => getInitialTierState(isPro, userId).resetsInMs);
  const [isAdOpen, setIsAdOpen] = useState<boolean>(false);
  const [isQuotaModalOpen, setIsQuotaModalOpen] = useState<boolean>(false);

  // Sync isPro whenever userPlan or localStorage changes
  useEffect(() => {
    if (typeof window === "undefined") return;
    const syncPlan = () => {
      const localPlan = window.localStorage.getItem(PLAN_STORAGE_KEY);
      const accRaw = window.localStorage.getItem("chess_reel_account");
      let accPlan: string | undefined;
      try {
        if (accRaw) accPlan = JSON.parse(accRaw)?.plan;
      } catch {}
      const effectivePro = isProPlan(userPlan) || isProPlan(localPlan) || isProPlan(accPlan);
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
    fetch("/api/tier/config")
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
      } else {
        setResetsInMs(0);
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
        const raw = window.localStorage.getItem(storageKey);
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
      const planParam = isPro ? "&plan=premium" : "";
      const res = await fetch(`/api/tier/quota?userId=${encodeURIComponent(userId)}${planParam}`);
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
          const limit = data.config?.freePuzzleLimit || data.quota.windowLimit || DEFAULT_TIER_CONFIG.freePuzzleLimit;
          const hours = data.config?.freeWindowHours || data.quota.windowHours || DEFAULT_TIER_CONFIG.freeWindowHours;
          const windowMs = hours * 3600 * 1000;
          const now = Date.now();

          let localValidTimestamps: number[] = [];
          try {
            if (typeof window !== "undefined") {
              const raw = window.localStorage.getItem(storageKey);
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

          const remaining = Math.max(0, limit - used);
          const effectiveCanPlay = remaining > 0;
          const resets = effectiveCanPlay ? 0 : (data.quota.resetsInMs || 0);

          setPuzzlesRemaining(remaining);
          setCanPlay(effectiveCanPlay);
          setResetsInMs(resets);
        }
      }
    } catch (e) {
      console.warn("Could not sync quota with server:", e);
    }
  }, [userId, isPro]);

  useEffect(() => {
    syncWithServer();
  }, [syncWithServer]);

  // Record a completed puzzle: checks quota & ad threshold
  const recordPuzzlePlayed = useCallback(
    (isWin: boolean): { shouldShowAd: boolean; quotaReached: boolean } => {
      if (isPro) {
        return { shouldShowAd: false, quotaReached: false };
      }

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

      // Check ad trigger: every `adFrequencyPuzzles` (default 2)
      let shouldShowAd = false;
      if (nextAdCount >= config.adFrequencyPuzzles) {
        shouldShowAd = true;
        nextAdCount = 0;
      }

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

      if (shouldShowAd) {
        setIsAdOpen(true);
      } else if (isQuotaDepleted) {
        setIsQuotaModalOpen(true);
      }

      return {
        shouldShowAd,
        quotaReached: isQuotaDepleted,
      };
    },
    [userId, isPro, config, puzzlesSinceLastAd]
  );

  // Upgrade user to Pro immediately and persist to database
  const upgradeToPro = useCallback(async () => {
    setIsPro(true);
    setPuzzlesRemaining(999999);
    setCanPlay(true);
    setResetsInMs(0);
    setIsAdOpen(false);
    setIsQuotaModalOpen(false);

    const storageKey = getTierStorageKey(userId);
    try {
      if (typeof window !== "undefined") {
        window.localStorage.setItem(PLAN_STORAGE_KEY, "premium");
        window.localStorage.removeItem(storageKey);
        const accRaw = window.localStorage.getItem("chess_reel_account");
        if (accRaw) {
          const acc = JSON.parse(accRaw);
          acc.plan = "premium";
          window.localStorage.setItem("chess_reel_account", JSON.stringify(acc));
        }
        window.dispatchEvent(new Event("plan-updated"));
        window.dispatchEvent(new Event("account-updated"));
      }
    } catch {}

    if (userId) {
      try {
        const res = await fetch("/api/user/upgrade", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId, plan: "premium" }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.user && typeof window !== "undefined") {
            window.localStorage.setItem("chess_reel_account", JSON.stringify(data.user));
            window.dispatchEvent(new Event("account-updated"));
          }
        }
      } catch (err) {
        console.warn("Could not persist upgrade to server:", err);
      }
    }
  }, [userId]);

  return {
    isPro,
    canPlay,
    puzzlesRemaining,
    windowLimit: config.freePuzzleLimit,
    windowHours: config.freeWindowHours,
    adFrequency: config.adFrequencyPuzzles,
    proPrice: config.proMonthlyPrice,
    annualDiscountPercent: config.annualDiscountPercent,
    resetsInMs,
    isAdOpen,
    isQuotaModalOpen,
    setIsAdOpen,
    setIsQuotaModalOpen,
    recordPuzzlePlayed,
    upgradeToPro,
    syncWithServer,
  };
}
