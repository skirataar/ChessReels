import { hydrateStreakFromDb } from "./useStreak";
import { sounds } from "./audio";
import { saveUserStatsSync } from "./userStats";

export interface UserAccountProgress {
  id: string;
  username: string;
  displayName?: string;
  avatar?: string;
  email?: string;
  googleId?: string;
  elo: number;
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
  isCalibrated: boolean;
  calibrationStep: number;
  plan?: string;
}

/**
 * Hydrates all PostgreSQL database-persisted progress into client localStorage,
 * audio/settings, and dispatches relevant window events.
 * This guarantees that when a user logs in, their exact database values become the
 * active client state, and prevents empty/default zeros from overwriting the database.
 */
export function hydrateUserSession(user: Partial<UserAccountProgress> & { id: string }): void {
  if (typeof window === "undefined" || !user?.id) return;

  try {
    // 1. Account Object
    window.localStorage.setItem("chess_reel_account", JSON.stringify(user));

    // 2. Elo & Rating & Synchronous Stats Cache
    if (typeof user.elo === "number") {
      window.localStorage.setItem("chess_reel_elo", String(user.elo));
      saveUserStatsSync({
        elo: user.elo,
        currentStreak: typeof user.streak === "number" ? user.streak : 0,
        lastSolvedDate: user.lastSolvedDate || null,
        streakFreezes: typeof user.streakFreezes === "number" ? user.streakFreezes : 0,
        isFrozenState: typeof user.isFrozenState === "boolean" ? user.isFrozenState : false,
        perfectWeekCounter: typeof user.perfectWeekCounter === "number" ? user.perfectWeekCounter : 0,
      });
    }
    if (typeof user.targetElo === "number") {
      window.localStorage.setItem("chess_reel_target_elo", String(user.targetElo));
    }

    // 3. Plan
    if (user.plan) {
      window.localStorage.setItem("chess_reel_plan", user.plan);
      window.dispatchEvent(new Event("plan-updated"));
    }

    // 4. Daily Streak, Streak Freezes & Regeneration Progress
    hydrateStreakFromDb({
      streak: user.streak,
      lastSolvedDate: user.lastSolvedDate,
      streakFreezes: user.streakFreezes,
      perfectWeekCounter: user.perfectWeekCounter,
      isFrozenState: user.isFrozenState,
    });

    // 5. Solved Puzzle IDs (anti-repetition)
    if (Array.isArray(user.solvedPuzzleIds) && user.solvedPuzzleIds.length > 0) {
      const existingRaw = window.localStorage.getItem("chess_reel_solved_ids");
      let existingSet = new Set<string>();
      if (existingRaw) {
        try {
          const parsed = JSON.parse(existingRaw);
          if (Array.isArray(parsed)) existingSet = new Set(parsed);
        } catch {}
      }
      user.solvedPuzzleIds.forEach((id) => existingSet.add(id));
      window.localStorage.setItem(
        "chess_reel_solved_ids",
        JSON.stringify(Array.from(existingSet))
      );
    }

    // 6. Bookmarks / Saved Puzzles
    if (Array.isArray(user.savedPuzzleIds)) {
      window.localStorage.setItem(
        `chess_reel_bookmarks_${user.id}`,
        JSON.stringify(user.savedPuzzleIds)
      );
      window.localStorage.setItem(
        "chess_reel_bookmarks",
        JSON.stringify(user.savedPuzzleIds)
      );
      window.dispatchEvent(new Event("bookmarks-updated"));
    }

    // 7. Liked Puzzles
    if (Array.isArray(user.likedPuzzleIds)) {
      window.localStorage.setItem(
        "chess_reel_likes",
        JSON.stringify(user.likedPuzzleIds)
      );
    }

    // 8. Gameplay Settings: Auto Advance
    if (typeof user.autoAdvance === "boolean") {
      window.localStorage.setItem("chess_reel_auto_advance", user.autoAdvance ? "1" : "0");
      window.dispatchEvent(new Event("auto-advance-updated"));
    }

    // 9. Gameplay Settings: Sound & SFX
    if (typeof user.soundEnabled === "boolean") {
      window.localStorage.setItem("chess_reel_muted", user.soundEnabled ? "0" : "1");
      sounds.setIsMuted(!user.soundEnabled);
    }

    // 10. Gameplay Settings: Board Coordinates
    if (typeof user.showCoordinates === "boolean") {
      window.localStorage.setItem("chess_reel_show_coordinates", user.showCoordinates ? "1" : "0");
      window.dispatchEvent(
        new CustomEvent("board-coordinates-updated", { detail: { show: user.showCoordinates } })
      );
    }

    // 11. Dispatch notifications
    window.dispatchEvent(new Event("account-updated"));
    window.dispatchEvent(new Event("tier-session-updated"));
  } catch (err) {
    console.warn("Failed to hydrate user session:", err);
  }
}
