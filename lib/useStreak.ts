"use client";

import { useSyncExternalStore, useCallback } from "react";

export const DAILY_STREAK_KEY = "chess_reel_daily_streak";
export const LAST_PLAYED_DATE_KEY = "chess_reel_last_played_date";
export const STREAK_DATA_KEY = "chess_reel_streak_data";
export const TOTAL_SOLVED_KEY = "chess_reel_total_solved";
export const TOTAL_FAILED_KEY = "chess_reel_total_failed";
export const SOLVE_COMBO_KEY = "chess_reel_solve_combo";
export const BEST_COMBO_KEY = "chess_reel_best_combo";

export interface StreakData {
  currentStreak: number;
  lastSolvedDate: string | null; // Strictly YYYY-MM-DD in local timezone
  streakFreezes: number;         // Integer strictly clamped between 0 and 2
  perfectWeekCounter: number;    // Tracks consecutive active solve days (0 to 7) toward earning a freeze
  isFrozenState?: boolean;       // True when streak is currently preserved by a freeze awaiting solve
}

export function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function addCalendarDays(dateStr: string, days: number): string {
  try {
    const [y, m, d] = dateStr.split("-").map(Number);
    if (!y || !m || !d) return dateStr;
    const date = new Date(Date.UTC(y, m - 1, d));
    date.setUTCDate(date.getUTCDate() + days);
    const ny = date.getUTCFullYear();
    const nm = String(date.getUTCMonth() + 1).padStart(2, "0");
    const nd = String(date.getUTCDate()).padStart(2, "0");
    return `${ny}-${nm}-${nd}`;
  } catch {
    return dateStr;
  }
}

export function getCalendarDaysDiff(fromDateStr: string, toDateStr: string): number {
  try {
    const [y1, m1, d1] = fromDateStr.split("-").map(Number);
    const [y2, m2, d2] = toDateStr.split("-").map(Number);
    if (!y1 || !m1 || !d1 || !y2 || !m2 || !d2) return 0;
    const utc1 = Date.UTC(y1, m1 - 1, d1);
    const utc2 = Date.UTC(y2, m2 - 1, d2);
    return Math.round((utc2 - utc1) / (1000 * 60 * 60 * 24));
  } catch {
    return 0;
  }
}

// Backward-compatible alias
export const getDaysDifference = getCalendarDaysDiff;

/**
 * Check Missed Days (App Load / Day Rollover)
 * Separated strictly from "Solve Puzzle Today".
 * - Consuming a freeze PRESERVES currentStreak at its exact existing value (never increments it).
 * - Running out of freezes drops currentStreak strictly to 0.
 */
export function resolveStreakOnLoad(data: StreakData, todayStr: string): StreakData {
  const freezes = Math.min(2, Math.max(0, data.streakFreezes || 0));
  if (data.currentStreak === 0 || !data.lastSolvedDate) {
    return {
      currentStreak: 0,
      lastSolvedDate: data.lastSolvedDate || null,
      streakFreezes: freezes,
      perfectWeekCounter: 0,
      isFrozenState: false,
    };
  }

  const daysDiff = getCalendarDaysDiff(data.lastSolvedDate, todayStr);

  if (daysDiff <= 0) {
    // Solved today or in future: active, not frozen
    return {
      ...data,
      streakFreezes: freezes,
      isFrozenState: false,
    };
  }

  if (daysDiff === 1) {
    // Solved yesterday: active streak, retain freeze state if set
    return {
      ...data,
      streakFreezes: freezes,
      isFrozenState: Boolean(data.isFrozenState),
    };
  }

  if (daysDiff === 2) {
    // Missed 1 calendar day
    if (freezes >= 1) {
      // Protected by 1 freeze: preserve currentStreak at exact existing value (never increment)
      return {
        currentStreak: data.currentStreak,
        lastSolvedDate: addCalendarDays(todayStr, -1), // advance to yesterday (the frozen day)
        streakFreezes: freezes - 1,
        perfectWeekCounter: 0,
        isFrozenState: true,
      };
    } else {
      // Streak lapsed: strictly reset to 0
      return {
        currentStreak: 0,
        lastSolvedDate: data.lastSolvedDate,
        streakFreezes: 0,
        perfectWeekCounter: 0,
        isFrozenState: false,
      };
    }
  }

  if (daysDiff === 3) {
    // Missed 2 calendar days
    if (freezes >= 2) {
      // Protected by 2 freezes: preserve currentStreak at exact existing value
      return {
        currentStreak: data.currentStreak,
        lastSolvedDate: addCalendarDays(todayStr, -1),
        streakFreezes: freezes - 2,
        perfectWeekCounter: 0,
        isFrozenState: true,
      };
    } else {
      // Insufficient freezes: strictly reset to 0
      return {
        currentStreak: 0,
        lastSolvedDate: data.lastSolvedDate,
        streakFreezes: 0,
        perfectWeekCounter: 0,
        isFrozenState: false,
      };
    }
  }

  // daysDiff > 3: Missed 3+ calendar days (exceeds 2-day protection limit)
  return {
    currentStreak: 0,
    lastSolvedDate: data.lastSolvedDate,
    streakFreezes: 0,
    perfectWeekCounter: 0,
    isFrozenState: false,
  };
}

/**
 * Solve Puzzle Today
 * - Resolves missed days first via resolveStreakOnLoad.
 * - When currentStreak === 0, immediately initializes from 0 to 1, sets lastSolvedDate to today, perfectWeek = 1.
 * - When solving today, clears isFrozenState back to false and increments currentStreak.
 */
export function resolveStreakOnSolve(data: StreakData, todayStr: string): StreakData {
  // 1. Reconcile day rollover / missed days to get current status before solving
  const current = resolveStreakOnLoad(data, todayStr);
  let freezes = current.streakFreezes;
  let streak = current.currentStreak;
  let perfectWeek = current.perfectWeekCounter;

  // Day 1 Streak Initialization:
  // When currentStreak === 0, solving a puzzle immediately increments currentStreak from 0 to 1,
  // sets lastSolvedDate to todayStr, perfectWeekCounter = 1, and isFrozenState = false.
  if (streak === 0 || !current.lastSolvedDate) {
    return {
      currentStreak: 1,
      lastSolvedDate: todayStr,
      streakFreezes: freezes,
      perfectWeekCounter: 1,
      isFrozenState: false,
    };
  }

  const daysDiff = getCalendarDaysDiff(current.lastSolvedDate, todayStr);

  if (daysDiff === 0) {
    // Already solved today; do not increment currentStreak again today
    return {
      currentStreak: Math.max(1, streak),
      lastSolvedDate: todayStr,
      streakFreezes: freezes,
      perfectWeekCounter: Math.max(1, perfectWeek),
      isFrozenState: false,
    };
  }

  if (daysDiff === 1) {
    // Consecutive Day Solved (or yesterday was preserved by freeze):
    // Thaw freeze state back to ignited amber and increment streak
    streak += 1;
    perfectWeek += 1;
    if (perfectWeek === 7) {
      perfectWeek = 0;
      freezes = Math.min(2, freezes + 1);
    }
    return {
      currentStreak: streak,
      lastSolvedDate: todayStr,
      streakFreezes: freezes,
      perfectWeekCounter: perfectWeek,
      isFrozenState: false,
    };
  }

  // Fallback if daysDiff > 1
  return {
    currentStreak: 1,
    lastSolvedDate: todayStr,
    streakFreezes: freezes,
    perfectWeekCounter: 1,
    isFrozenState: false,
  };
}

export interface StreakStats {
  dailyStreak: number;
  streakFreezes: number;
  perfectWeekCounter: number;
  combo: number;
  bestCombo: number;
  lastPlayedDate: string | null;
  totalSolved: number;
  totalFailed: number;
  isFrozenState: boolean;
}

const SERVER_SNAPSHOT: StreakStats = {
  dailyStreak: 0,
  streakFreezes: 0,
  perfectWeekCounter: 0,
  combo: 0,
  bestCombo: 0,
  lastPlayedDate: null,
  totalSolved: 0,
  totalFailed: 0,
  isFrozenState: false,
};

let cachedSnapshot: StreakStats = SERVER_SNAPSHOT;

function getSnapshot(): StreakStats {
  if (typeof window === "undefined") return SERVER_SNAPSHOT;

  try {
    const today = getTodayDateString();
    const storedStreakDataRaw = window.localStorage.getItem(STREAK_DATA_KEY);
    const rawLegacyLastDate = window.localStorage.getItem(LAST_PLAYED_DATE_KEY);
    const rawLegacyStreak = parseInt(
      window.localStorage.getItem(DAILY_STREAK_KEY) || "0",
      10
    );

    let streakData: StreakData;
    if (storedStreakDataRaw) {
      try {
        const parsed = JSON.parse(storedStreakDataRaw);
        streakData = {
          currentStreak: typeof parsed.currentStreak === "number" ? parsed.currentStreak : 0,
          lastSolvedDate: parsed.lastSolvedDate || null,
          streakFreezes: Math.min(2, Math.max(0, parsed.streakFreezes || 0)),
          perfectWeekCounter: Math.min(7, Math.max(0, parsed.perfectWeekCounter || 0)),
          isFrozenState: Boolean(parsed.isFrozenState),
        };
      } catch {
        streakData = {
          currentStreak: rawLegacyStreak,
          lastSolvedDate: rawLegacyLastDate,
          streakFreezes: 0,
          perfectWeekCounter: 0,
          isFrozenState: false,
        };
      }
    } else {
      streakData = {
        currentStreak: rawLegacyStreak,
        lastSolvedDate: rawLegacyLastDate,
        streakFreezes: 0,
        perfectWeekCounter: 0,
        isFrozenState: false,
      };
    }

    // Resolve active state on load
    const effectiveStreakData = resolveStreakOnLoad(streakData, today);

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

    if (
      cachedSnapshot.dailyStreak !== effectiveStreakData.currentStreak ||
      cachedSnapshot.streakFreezes !== effectiveStreakData.streakFreezes ||
      cachedSnapshot.perfectWeekCounter !== effectiveStreakData.perfectWeekCounter ||
      cachedSnapshot.combo !== rawCombo ||
      cachedSnapshot.bestCombo !== rawBestCombo ||
      cachedSnapshot.lastPlayedDate !== effectiveStreakData.lastSolvedDate ||
      cachedSnapshot.totalSolved !== totalSolved ||
      cachedSnapshot.totalFailed !== totalFailed ||
      cachedSnapshot.isFrozenState !== Boolean(effectiveStreakData.isFrozenState)
    ) {
      cachedSnapshot = {
        dailyStreak: effectiveStreakData.currentStreak,
        streakFreezes: effectiveStreakData.streakFreezes,
        perfectWeekCounter: effectiveStreakData.perfectWeekCounter,
        combo: rawCombo,
        bestCombo: rawBestCombo,
        lastPlayedDate: effectiveStreakData.lastSolvedDate,
        totalSolved,
        totalFailed,
        isFrozenState: Boolean(effectiveStreakData.isFrozenState),
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
    window.localStorage.removeItem(STREAK_DATA_KEY);
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
      const storedStreakDataRaw = window.localStorage.getItem(STREAK_DATA_KEY);
      const rawLegacyLastDate = window.localStorage.getItem(LAST_PLAYED_DATE_KEY);
      const rawLegacyStreak = parseInt(
        window.localStorage.getItem(DAILY_STREAK_KEY) || "0",
        10
      );

      let currentStreakData: StreakData;
      if (storedStreakDataRaw) {
        try {
          const parsed = JSON.parse(storedStreakDataRaw);
          currentStreakData = {
            currentStreak: typeof parsed.currentStreak === "number" ? parsed.currentStreak : 0,
            lastSolvedDate: parsed.lastSolvedDate || null,
            streakFreezes: Math.min(2, Math.max(0, parsed.streakFreezes || 0)),
            perfectWeekCounter: Math.min(7, Math.max(0, parsed.perfectWeekCounter || 0)),
            isFrozenState: Boolean(parsed.isFrozenState),
          };
        } catch {
          currentStreakData = {
            currentStreak: rawLegacyStreak,
            lastSolvedDate: rawLegacyLastDate,
            streakFreezes: 0,
            perfectWeekCounter: 0,
            isFrozenState: false,
          };
        }
      } else {
        currentStreakData = {
          currentStreak: rawLegacyStreak,
          lastSolvedDate: rawLegacyLastDate,
          streakFreezes: 0,
          perfectWeekCounter: 0,
          isFrozenState: false,
        };
      }

      let nextStreakData = currentStreakData;

      // Only win / correct solves advance or consume freezes for daily streak
      if (result === "win" || result === undefined) {
        nextStreakData = resolveStreakOnSolve(currentStreakData, today);
        window.localStorage.setItem(STREAK_DATA_KEY, JSON.stringify(nextStreakData));
        window.localStorage.setItem(DAILY_STREAK_KEY, String(nextStreakData.currentStreak));
        window.localStorage.setItem(LAST_PLAYED_DATE_KEY, nextStreakData.lastSolvedDate || today);
      }

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
    streakFreezes: stats.streakFreezes,
    perfectWeekCounter: stats.perfectWeekCounter,
    isFrozenState: stats.isFrozenState,
    combo: stats.combo,
    bestCombo: stats.bestCombo,
    totalSolved: stats.totalSolved,
    totalFailed: stats.totalFailed,
    lastPlayedDate: stats.lastPlayedDate,
    recordPuzzlePlay,
    refreshStats: notifyListeners,
  };
}
