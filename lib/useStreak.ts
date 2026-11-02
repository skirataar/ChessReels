"use client";

import { useSyncExternalStore, useCallback } from "react";

export const DAILY_STREAK_KEY = "chess_reel_daily_streak";
export const LAST_PLAYED_DATE_KEY = "chess_reel_last_played_date";
export const TOTAL_SOLVED_KEY = "chess_reel_total_solved";
export const TOTAL_FAILED_KEY = "chess_reel_total_failed";
export const SOLVE_COMBO_KEY = "chess_reel_solve_combo";
export const BEST_COMBO_KEY = "chess_reel_best_combo";

export function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getDaysDifference(pastDateStr: string, currentDateStr: string): number {
  try {
    const d1 = new Date(pastDateStr + "T00:00:00");
    const d2 = new Date(currentDateStr + "T00:00:00");
    const diffTime = d2.getTime() - d1.getTime();
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  } catch {
    return 0;
  }
}

export interface StreakStats {
  dailyStreak: number;
  combo: number;
  bestCombo: number;
  lastPlayedDate: string | null;
  totalSolved: number;
  totalFailed: number;
}

const SERVER_SNAPSHOT: StreakStats = {
  dailyStreak: 0,
  combo: 0,
  bestCombo: 0,
  lastPlayedDate: null,
  totalSolved: 0,
  totalFailed: 0,
};

let cachedSnapshot: StreakStats = SERVER_SNAPSHOT;

function getSnapshot(): StreakStats {
  if (typeof window === "undefined") return SERVER_SNAPSHOT;

  try {
    const lastDate = window.localStorage.getItem(LAST_PLAYED_DATE_KEY);
    const rawStreak = parseInt(
      window.localStorage.getItem(DAILY_STREAK_KEY) || "0",
      10
    );
    const rawCombo = parseInt(
      window.localStorage.getItem(SOLVE_COMBO_KEY) || "0",
      10
    );
    const rawBestCombo = parseInt(
      window.localStorage.getItem(BEST_COMBO_KEY) || "0",
      10
    );
    const totalSolved = parseInt(
      window.localStorage.getItem(TOTAL_SOLVED_KEY) || "0",
      10
    );
    const totalFailed = parseInt(
      window.localStorage.getItem(TOTAL_FAILED_KEY) || "0",
      10
    );

    let effectiveStreak = rawStreak;
    if (lastDate) {
      const today = getTodayDateString();
      const diff = getDaysDifference(lastDate, today);
      if (diff > 1) {
        effectiveStreak = 0;
      }
    }

    if (
      cachedSnapshot.dailyStreak !== effectiveStreak ||
      cachedSnapshot.combo !== rawCombo ||
      cachedSnapshot.bestCombo !== rawBestCombo ||
      cachedSnapshot.lastPlayedDate !== lastDate ||
      cachedSnapshot.totalSolved !== totalSolved ||
      cachedSnapshot.totalFailed !== totalFailed
    ) {
      cachedSnapshot = {
        dailyStreak: effectiveStreak,
        combo: rawCombo,
        bestCombo: rawBestCombo,
        lastPlayedDate: lastDate,
        totalSolved,
        totalFailed,
      };
    }

    return cachedSnapshot;
  } catch {
    return SERVER_SNAPSHOT;
  }
}

function getServerSnapshot(): StreakStats {
  return SERVER_SNAPSHOT;
}

type Listener = () => void;
const listeners = new Set<Listener>();

function notifyListeners() {
  listeners.forEach((listener) => listener());
}

function subscribe(callback: Listener) {
  listeners.add(callback);
  if (typeof window !== "undefined") {
    window.addEventListener("storage", callback);
  }
  return () => {
    listeners.delete(callback);
    if (typeof window !== "undefined") {
      window.removeEventListener("storage", callback);
    }
  };
}

export function resetStreakStats() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(DAILY_STREAK_KEY);
    window.localStorage.removeItem(LAST_PLAYED_DATE_KEY);
    window.localStorage.removeItem(TOTAL_SOLVED_KEY);
    window.localStorage.removeItem(TOTAL_FAILED_KEY);
    window.localStorage.removeItem(SOLVE_COMBO_KEY);
    window.localStorage.removeItem(BEST_COMBO_KEY);
    cachedSnapshot = SERVER_SNAPSHOT;
    notifyListeners();
  } catch {}
}

export function useStreak() {
  const stats = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  // Record a puzzle result: updates daily streak, combo streak, and totals
  const recordPuzzlePlay = useCallback((result?: "win" | "loss") => {
    if (typeof window === "undefined") return;

    try {
      const today = getTodayDateString();
      const lastDate = window.localStorage.getItem(LAST_PLAYED_DATE_KEY);
      const storedStreak = parseInt(
        window.localStorage.getItem(DAILY_STREAK_KEY) || "0",
        10
      );

      let nextStreak = storedStreak;

      if (!lastDate) {
        // First time ever playing
        nextStreak = 1;
      } else {
        const diff = getDaysDifference(lastDate, today);
        if (diff === 0) {
          // User plays today and already played today -> keep streak active (at least 1)
          nextStreak = Math.max(1, storedStreak);
        } else if (diff === 1) {
          // User plays today and last_played_date was yesterday -> increment streak
          nextStreak = storedStreak + 1;
        } else {
          // last_played_date was more than a day ago -> reset to 1
          nextStreak = 1;
        }
      }

      // Update last_played_date to today
      window.localStorage.setItem(LAST_PLAYED_DATE_KEY, today);
      window.localStorage.setItem(DAILY_STREAK_KEY, String(nextStreak));

      // Update solve combo (consecutive correct answers in a row)
      const storedCombo = parseInt(
        window.localStorage.getItem(SOLVE_COMBO_KEY) || "0",
        10
      );
      const storedBestCombo = parseInt(
        window.localStorage.getItem(BEST_COMBO_KEY) || "0",
        10
      );

      let nextCombo = storedCombo;
      let nextBestCombo = storedBestCombo;

      if (result === "win") {
        nextCombo = storedCombo + 1;
        nextBestCombo = Math.max(storedBestCombo, nextCombo);
      } else if (result === "loss") {
        nextCombo = 0;
      }

      window.localStorage.setItem(SOLVE_COMBO_KEY, String(nextCombo));
      window.localStorage.setItem(BEST_COMBO_KEY, String(nextBestCombo));

      // Update totals
      if (result === "win") {
        const solved =
          parseInt(
            window.localStorage.getItem(TOTAL_SOLVED_KEY) || "0",
            10
          ) + 1;
        window.localStorage.setItem(TOTAL_SOLVED_KEY, String(solved));
      } else if (result === "loss") {
        const failed =
          parseInt(
            window.localStorage.getItem(TOTAL_FAILED_KEY) || "0",
            10
          ) + 1;
        window.localStorage.setItem(TOTAL_FAILED_KEY, String(failed));
      }

      notifyListeners();
    } catch (err) {
      console.error("Failed to record puzzle play:", err);
    }
  }, []);

  return {
    dailyStreak: stats.dailyStreak,
    combo: stats.combo,
    bestCombo: stats.bestCombo,
    totalSolved: stats.totalSolved,
    totalFailed: stats.totalFailed,
    lastPlayedDate: stats.lastPlayedDate,
    recordPuzzlePlay,
    refreshStats: notifyListeners,
  };
}
