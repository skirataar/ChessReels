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
}

export function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
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

export function resolveStreakOnLoad(data: StreakData, todayStr: string): StreakData {
  const freezes = Math.min(2, Math.max(0, data.streakFreezes || 0));
  if (!data.lastSolvedDate) {
    return {
      currentStreak: 0,
      lastSolvedDate: null,
      streakFreezes: freezes,
      perfectWeekCounter: 0,
    };
  }

  const daysDiff = getCalendarDaysDiff(data.lastSolvedDate, todayStr);

  if (daysDiff <= 1) {
    // Solved today or yesterday: streak is currently active
    return {
      ...data,
      streakFreezes: freezes,
    };
  }

  if (daysDiff === 2) {
    // Missed 1 calendar day
    if (freezes >= 1) {
      // Protected by freeze
      return {
        ...data,
        streakFreezes: freezes,
      };
    } else {
      // Streak lapsed
      return {
        currentStreak: 0,
        lastSolvedDate: data.lastSolvedDate,
        streakFreezes: 0,
        perfectWeekCounter: 0,
      };
    }
  }

  if (daysDiff === 3) {
    // Missed 2 calendar days
    if (freezes >= 2) {
      // Protected by 2 freezes
      return {
        ...data,
        streakFreezes: freezes,
      };
    } else {
      // Streak lapsed
      return {
        currentStreak: 0,
        lastSolvedDate: data.lastSolvedDate,
        streakFreezes: 0,
        perfectWeekCounter: 0,
      };
    }
  }

  // daysDiff > 3: Missed 3+ calendar days
  return {
    currentStreak: 0,
    lastSolvedDate: data.lastSolvedDate,
    streakFreezes: 0,
    perfectWeekCounter: 0,
  };
}

export function resolveStreakOnSolve(data: StreakData, todayStr: string): StreakData {
  let freezes = Math.min(2, Math.max(0, data.streakFreezes || 0));
  let currentStreak = data.currentStreak || 0;
  let perfectWeek = data.perfectWeekCounter || 0;

  if (!data.lastSolvedDate) {
    // First puzzle ever solved
    return {
      currentStreak: 1,
      lastSolvedDate: todayStr,
      streakFreezes: freezes,
      perfectWeekCounter: 1,
    };
  }

  const daysDiff = getCalendarDaysDiff(data.lastSolvedDate, todayStr);

  if (daysDiff === 0) {
    // Already solved today; do not increment currentStreak again today
    return {
      currentStreak: Math.max(1, currentStreak),
      lastSolvedDate: todayStr,
      streakFreezes: freezes,
      perfectWeekCounter: Math.max(1, perfectWeek),
    };
  }

  if (daysDiff === 1) {
    // Consecutive Day Solved
    currentStreak += 1;
    perfectWeek += 1;
    if (perfectWeek === 7) {
      perfectWeek = 0;
      freezes = Math.min(2, freezes + 1);
    }
    return {
      currentStreak,
      lastSolvedDate: todayStr,
      streakFreezes: freezes,
      perfectWeekCounter: perfectWeek,
    };
  }

  if (daysDiff === 2) {
    // Missed 1 Calendar Day
    if (freezes >= 1) {
      // Consume 1 freeze, preserve streak (do not reset to 0), reset perfectWeek = 0, increment for today
      freezes -= 1;
      currentStreak += 1;
      perfectWeek = 0;
      return {
        currentStreak,
        lastSolvedDate: todayStr,
        streakFreezes: freezes,
        perfectWeekCounter: 0,
      };
    } else {
      // No freeze available: streak reset to 1
      return {
        currentStreak: 1,
        lastSolvedDate: todayStr,
        streakFreezes: 0,
        perfectWeekCounter: 1,
      };
    }
  }

  if (daysDiff === 3) {
    // Missed 2 Calendar Days
    if (freezes >= 2) {
      // Consume 2 freezes, preserve streak, reset perfectWeek = 0, increment for today
      freezes -= 2;
      currentStreak += 1;
      perfectWeek = 0;
      return {
        currentStreak,
        lastSolvedDate: todayStr,
        streakFreezes: freezes,
        perfectWeekCounter: 0,
      };
    } else {
      // Less than 2 freezes: streak reset to 1
      return {
        currentStreak: 1,
        lastSolvedDate: todayStr,
        streakFreezes: 0,
        perfectWeekCounter: 1,
      };
    }
  }

  // daysDiff > 3: Missed 3+ Calendar Days
  return {
    currentStreak: 1,
    lastSolvedDate: todayStr,
    streakFreezes: 0,
    perfectWeekCounter: 1,
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
        };
      } catch {
        streakData = {
          currentStreak: rawLegacyStreak,
          lastSolvedDate: rawLegacyLastDate,
          streakFreezes: 0,
          perfectWeekCounter: 0,
        };
      }
    } else {
      streakData = {
        currentStreak: rawLegacyStreak,
        lastSolvedDate: rawLegacyLastDate,
        streakFreezes: 0,
        perfectWeekCounter: 0,
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
      cachedSnapshot.totalFailed !== totalFailed
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
          };
        } catch {
          currentStreakData = {
            currentStreak: rawLegacyStreak,
            lastSolvedDate: rawLegacyLastDate,
            streakFreezes: 0,
            perfectWeekCounter: 0,
          };
        }
      } else {
        currentStreakData = {
          currentStreak: rawLegacyStreak,
          lastSolvedDate: rawLegacyLastDate,
          streakFreezes: 0,
          perfectWeekCounter: 0,
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
    combo: stats.combo,
    bestCombo: stats.bestCombo,
    totalSolved: stats.totalSolved,
    totalFailed: stats.totalFailed,
    lastPlayedDate: stats.lastPlayedDate,
    recordPuzzlePlay,
    refreshStats: notifyListeners,
  };
}
