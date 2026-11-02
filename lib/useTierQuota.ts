"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { TierConfig, DEFAULT_TIER_CONFIG } from "./tierTypes";

const TIER_STORAGE_KEY = "chess_reel_tier_session";
const PLAN_STORAGE_KEY = "chess_reel_plan";

interface LocalTierSession {
  solveTimestamps: number[]; // epoch ms of solves in active window
  puzzlesSinceLastAd: number;
}

export function useTierQuota(
  userId: string,
  userPlan?: string | null
) {
  const [config, setConfig] = useState<TierConfig>(DEFAULT_TIER_CONFIG);
  const [isPro, setIsPro] = useState<boolean>(() => {
    if (userPlan === "premium") return true;
    if (typeof window !== "undefined") {
      const localPlan = window.localStorage.getItem(PLAN_STORAGE_KEY);
      if (localPlan === "premium") return true;
      try {
        const acc = JSON.parse(window.localStorage.getItem("chess_reel_account") || "{}");
        if (acc?.plan === "premium") return true;
      } catch {}
    }
    return false;
  });
  const [puzzlesRemaining, setPuzzlesRemaining] = useState<number>(DEFAULT_TIER_CONFIG.freePuzzleLimit);
  const [puzzlesSinceLastAd, setPuzzlesSinceLastAd] = useState<number>(0);
  const [canPlay, setCanPlay] = useState<boolean>(true);
  const [resetsInMs, setResetsInMs] = useState<number>(0);
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
      const effectivePro = userPlan === "premium" || localPlan === "premium" || accPlan === "premium";
      setIsPro(effectivePro);
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

  // Load and clean stored local session
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(TIER_STORAGE_KEY);
      if (raw) {
        const parsed: LocalTierSession = JSON.parse(raw);
        setPuzzlesSinceLastAd(parsed.puzzlesSinceLastAd || 0);
        recalculateQuota(parsed.solveTimestamps || [], config, isPro);
      } else {
        recalculateQuota([], config, isPro);
      }
    } catch {
      recalculateQuota([], config, isPro);
    }
  }, [config, isPro, recalculateQuota]);

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
          } else {
            setPuzzlesRemaining(data.quota.puzzlesRemaining);
            setCanPlay(data.quota.canPlay);
            setResetsInMs(data.quota.resetsInMs);
          }
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

      let timestamps: number[] = [];
      let nextAdCount = puzzlesSinceLastAd + 1;

      try {
        if (typeof window !== "undefined") {
          const raw = window.localStorage.getItem(TIER_STORAGE_KEY);
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

      // Persist to localStorage
      try {
        if (typeof window !== "undefined") {
          const sessionData: LocalTierSession = {
            solveTimestamps: timestamps,
            puzzlesSinceLastAd: nextAdCount,
          };
          window.localStorage.setItem(TIER_STORAGE_KEY, JSON.stringify(sessionData));
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
    [isPro, config, puzzlesSinceLastAd]
  );

  // Upgrade user to Pro immediately
  const upgradeToPro = useCallback(() => {
    setIsPro(true);
    setPuzzlesRemaining(999999);
    setCanPlay(true);
    setResetsInMs(0);
    setIsAdOpen(false);
    setIsQuotaModalOpen(false);

    try {
      if (typeof window !== "undefined") {
        window.localStorage.setItem(PLAN_STORAGE_KEY, "premium");
        const accRaw = window.localStorage.getItem("chess_reel_account");
        if (accRaw) {
          const acc = JSON.parse(accRaw);
          acc.plan = "premium";
          window.localStorage.setItem("chess_reel_account", JSON.stringify(acc));
        }
        window.dispatchEvent(new Event("plan-updated"));
      }
    } catch {}

    if (userId) {
      fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, plan: "premium" }),
      }).catch(() => {});
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
