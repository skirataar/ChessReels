/**
 * Single source of truth for user progression stats.
 * Uses `chessreels_user_stats_v1` in localStorage as an instant synchronous cache
 * alongside PostgreSQL database persistence.
 */

export const USER_STATS_CACHE_KEY = "chessreels_user_stats_v1";

export interface UserStatsCache {
  elo: number;
  currentStreak: number;
  lastSolvedDate: string | null;
  streakFreezes: number;
  isFrozenState: boolean;
  perfectWeekCounter: number;
  comboCount: number;
}

const DEFAULT_STATS: UserStatsCache = {
  elo: 1200,
  currentStreak: 0,
  lastSolvedDate: null,
  streakFreezes: 0,
  isFrozenState: false,
  perfectWeekCounter: 0,
  comboCount: 0,
};

export function getTodayDateString(): string {
  // Returns local date formatted as YYYY-MM-DD
  return new Date().toLocaleDateString("en-CA");
}

/**
 * Lazy Synchronous Initialization:
 * Reads `chessreels_user_stats_v1` from localStorage inside useState initializer.
 * Never starts at 0 if previous valid data exists.
 */
export function getStoredUserStats(): UserStatsCache {
  if (typeof window === "undefined") {
    return { ...DEFAULT_STATS };
  }

  try {
    const raw = window.localStorage.getItem(USER_STATS_CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") {
        return {
          elo: typeof parsed.elo === "number" && !isNaN(parsed.elo) ? parsed.elo : 1200,
          currentStreak:
            typeof parsed.currentStreak === "number" && !isNaN(parsed.currentStreak)
              ? parsed.currentStreak
              : 0,
          lastSolvedDate: parsed.lastSolvedDate || null,
          streakFreezes:
            typeof parsed.streakFreezes === "number" && !isNaN(parsed.streakFreezes)
              ? Math.min(2, Math.max(0, parsed.streakFreezes))
              : 0,
          isFrozenState: Boolean(parsed.isFrozenState),
          perfectWeekCounter:
            typeof parsed.perfectWeekCounter === "number" && !isNaN(parsed.perfectWeekCounter)
              ? Math.min(7, Math.max(0, parsed.perfectWeekCounter))
              : 0,
          comboCount:
            typeof parsed.comboCount === "number" && !isNaN(parsed.comboCount)
              ? Math.max(0, parsed.comboCount)
              : 0,
        };
      }
    }

    // Migrate from legacy keys if primary cache does not exist yet
    const legacyElo = window.localStorage.getItem("chess_reel_elo");
    const legacyStreak = window.localStorage.getItem("chess_reel_daily_streak");
    const legacyDate = window.localStorage.getItem("chess_reel_last_played_date");
    const legacyDataRaw = window.localStorage.getItem("chess_reel_streak_data");
    const legacyCombo = window.localStorage.getItem("chess_reel_solve_combo");

    let legacyDataParsed: any = null;
    try {
      if (legacyDataRaw) legacyDataParsed = JSON.parse(legacyDataRaw);
    } catch {}

    const eloParsed = legacyElo ? parseInt(legacyElo, 10) : NaN;
    const streakParsed = legacyDataParsed?.currentStreak ?? (legacyStreak ? parseInt(legacyStreak, 10) : NaN);
    const comboParsed = legacyCombo ? parseInt(legacyCombo, 10) : NaN;

    const migrated: UserStatsCache = {
      elo: !isNaN(eloParsed) && eloParsed > 0 ? eloParsed : 1200,
      currentStreak: !isNaN(streakParsed) && streakParsed >= 0 ? streakParsed : 0,
      lastSolvedDate: legacyDataParsed?.lastSolvedDate ?? legacyDate ?? null,
      streakFreezes: legacyDataParsed?.streakFreezes ?? 0,
      isFrozenState: Boolean(legacyDataParsed?.isFrozenState),
      perfectWeekCounter: legacyDataParsed?.perfectWeekCounter ?? 0,
      comboCount: !isNaN(comboParsed) && comboParsed >= 0 ? comboParsed : 0,
    };

    if (legacyElo || legacyStreak || legacyDate || legacyDataRaw) {
      window.localStorage.setItem(USER_STATS_CACHE_KEY, JSON.stringify(migrated));
    }

    return migrated;
  } catch {
    return { ...DEFAULT_STATS };
  }
}

/**
 * Synchronous write to `chessreels_user_stats_v1` and legacy keys for compatibility.
 */
export function saveUserStatsSync(stats: Partial<UserStatsCache>): UserStatsCache {
  if (typeof window === "undefined") {
    return { ...DEFAULT_STATS, ...stats };
  }

  const current = getStoredUserStats();
  const next: UserStatsCache = {
    ...current,
    ...stats,
    streakFreezes:
      stats.streakFreezes !== undefined
        ? Math.min(2, Math.max(0, stats.streakFreezes))
        : current.streakFreezes,
    perfectWeekCounter:
      stats.perfectWeekCounter !== undefined
        ? Math.min(7, Math.max(0, stats.perfectWeekCounter))
        : current.perfectWeekCounter,
  };

  try {
    window.localStorage.setItem(USER_STATS_CACHE_KEY, JSON.stringify(next));

    // Mirror to legacy keys so existing UI/tests remain 100% functional
    window.localStorage.setItem("chess_reel_elo", String(next.elo));
    window.localStorage.setItem("chess_reel_daily_streak", String(next.currentStreak));
    if (next.lastSolvedDate) {
      window.localStorage.setItem("chess_reel_last_played_date", next.lastSolvedDate);
    }
    window.localStorage.setItem("chess_reel_solve_combo", String(next.comboCount));
    window.localStorage.setItem(
      "chess_reel_streak_data",
      JSON.stringify({
        currentStreak: next.currentStreak,
        lastSolvedDate: next.lastSolvedDate,
        streakFreezes: next.streakFreezes,
        perfectWeekCounter: next.perfectWeekCounter,
        isFrozenState: next.isFrozenState,
      })
    );

    // Update account object in cache if present
    const rawAcc = window.localStorage.getItem("chess_reel_account");
    if (rawAcc) {
      try {
        const acc = JSON.parse(rawAcc);
        if (acc && typeof acc === "object") {
          window.localStorage.setItem(
            "chess_reel_account",
            JSON.stringify({
              ...acc,
              elo: next.elo,
              streak: next.currentStreak,
              lastSolvedDate: next.lastSolvedDate,
              streakFreezes: next.streakFreezes,
              isFrozenState: next.isFrozenState,
              perfectWeekCounter: next.perfectWeekCounter,
            })
          );
        }
      } catch {}
    }

    // Notify any local listeners
    window.dispatchEvent(new CustomEvent("chessreels-user-stats-updated", { detail: next }));
  } catch {}

  return next;
}

/**
 * Database Hydration Merge Rule (Math.max Safety):
 * Only overwrites local state if DB actually has valid saved data.
 * If local state has a higher streak or today's lastSolvedDate not yet in DB,
 * keeps local state and syncs to DB.
 */
export function mergeDbStatsWithLocal(dbUser: {
  elo?: number;
  streak?: number;
  currentStreak?: number;
  lastSolvedDate?: string | null;
  streakFreezes?: number;
  isFrozenState?: boolean;
  perfectWeekCounter?: number;
  comboCount?: number;
}): UserStatsCache {
  const local = getStoredUserStats();
  const today = getTodayDateString();

  const dbStreak =
    typeof dbUser.streak === "number"
      ? dbUser.streak
      : typeof dbUser.currentStreak === "number"
      ? dbUser.currentStreak
      : 0;
  const dbElo = typeof dbUser.elo === "number" && !isNaN(dbUser.elo) ? dbUser.elo : 0;
  const dbLastSolved = dbUser.lastSolvedDate || null;

  // Protect local progress: if local was solved today and DB doesn't have today yet, keep local!
  const hasLocalUnsyncedToday = local.lastSolvedDate === today && dbLastSolved !== today;

  const effectiveStreak = hasLocalUnsyncedToday
    ? Math.max(local.currentStreak, dbStreak)
    : dbStreak > 0
    ? Math.max(local.currentStreak, dbStreak)
    : local.currentStreak;

  const effectiveLastDate = hasLocalUnsyncedToday
    ? local.lastSolvedDate
    : dbLastSolved || local.lastSolvedDate;

  const effectiveElo = dbElo > 0 ? dbElo : local.elo || 1200;

  const merged: UserStatsCache = {
    elo: effectiveElo,
    currentStreak: effectiveStreak,
    lastSolvedDate: effectiveLastDate,
    streakFreezes:
      typeof dbUser.streakFreezes === "number" ? dbUser.streakFreezes : local.streakFreezes,
    isFrozenState:
      typeof dbUser.isFrozenState === "boolean" ? dbUser.isFrozenState : local.isFrozenState,
    perfectWeekCounter:
      typeof dbUser.perfectWeekCounter === "number"
        ? dbUser.perfectWeekCounter
        : local.perfectWeekCounter,
    comboCount: local.comboCount,
  };

  saveUserStatsSync(merged);

  return merged;
}

