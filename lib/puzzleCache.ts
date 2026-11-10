import { PuzzleData } from "@/components/PuzzleCard";
import { resetStreakStats } from "@/lib/useStreak";

const TARGET_BUFFER_SIZE = 5;

/**
 * Returns a localStorage key for the puzzle queue scoped by userId.
 * This guarantees accounts with different Elo ratings never share cached queues.
 */
export function getQueueKey(userId?: string): string {
  if (userId && typeof userId === "string" && userId.trim().length > 0) {
    return `chess_reel_puzzle_queue_${userId.trim()}`;
  }
  return "chess_reel_puzzle_queue";
}

// Safe localStorage accessor to guard against SSR and Safari Private Browsing
function safeGetItem(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(key);
  } catch (e) {
    console.warn("localStorage is unavailable:", e);
    return null;
  }
}

function safeSetItem(key: string, value: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, value);
  } catch (e) {
    console.warn("Failed to write to localStorage:", e);
  }
}

function safeRemoveItem(key: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(key);
  } catch (e) {
    console.warn("Failed to remove item from localStorage:", e);
  }
}

/**
 * Retrieves the currently queued puzzles from local storage for a specific user.
 */
export function getStoredQueue(userId?: string): PuzzleData[] {
  const raw = safeGetItem(getQueueKey(userId));
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (p) =>
        p &&
        typeof p === "object" &&
        typeof p.id === "string" &&
        typeof p.fen === "string" &&
        p.fen.trim().length > 0 &&
        typeof p.moves === "string" &&
        p.moves.trim().length > 0
    ) as PuzzleData[];
  } catch {
    return [];
  }
}

/**
 * Saves the puzzle array back to local storage for a specific user.
 */
export function saveQueue(queue: PuzzleData[], userId?: string): void {
  if (typeof window !== "undefined" && userId) {
    const rawAccount = safeGetItem("chess_reel_account");
    if (!rawAccount) return; // User is logged out; abort writing stale queue
    try {
      const parsed = JSON.parse(rawAccount);
      if (parsed.id !== userId) return; // Account switched; abort writing to previous user queue
    } catch {
      return;
    }
  }
  safeSetItem(getQueueKey(userId), JSON.stringify(queue));
}

/**
 * Pops the next cached puzzle from the front of the queue for a specific user.
 */
export function popNextPuzzle(userId?: string): PuzzleData | null {
  const queue = getStoredQueue(userId);
  if (queue.length === 0) return null;

  const next = queue.shift() ?? null;
  saveQueue(queue, userId);
  return next;
}

/**
 * Prefetches random puzzles around the user's current Elo to top up the buffer.
 */
export async function prefetchPuzzles(
  elo: number,
  targetSize: number = TARGET_BUFFER_SIZE,
  userId?: string
): Promise<void> {
  if (typeof window !== "undefined" && !window.navigator.onLine) {
    return; // Don't attempt to prefetch when offline
  }

  const currentQueue = getStoredQueue(userId);
  const needed = Math.max(0, targetSize - currentQueue.length);

  if (needed <= 0) return;

  const existingIds = new Set(currentQueue.map((p) => p.id));
  try {
    const userQuery = userId ? `&userId=${encodeURIComponent(userId)}` : "";
    const res = await fetch(
      `/api/puzzle/random?elo=${elo}&count=${needed}${userQuery}`
    );
    if (res.ok) {
      const data = await res.json();
      const fetched: PuzzleData[] = Array.isArray(data) ? data : [data];
      const newPuzzles = fetched.filter((p) => p && !existingIds.has(p.id));

      if (newPuzzles.length > 0) {
        const updated = [...getStoredQueue(userId), ...newPuzzles];
        saveQueue(updated, userId);
      }
    }
  } catch (err) {
    console.warn("Failed to prefetch puzzles batch:", err);
  }
}

/**
 * Completely clears all cached puzzle queues, session storage, and localStorage keys
 * related to puzzles, Elo, streak, and user state on sign out or account switch.
 */
export function clearAllUserAndPuzzleCache(userId?: string): void {
  if (typeof window === "undefined") return;

  // 1. Clear session storage
  try {
    window.sessionStorage.clear();
  } catch {}

  // 2. Clear all auth cookies
  try {
    if (typeof document !== "undefined") {
      const cookies = [
        "chess_reel_session",
        "chess_reel_oauth_user",
        "chess_reel_pending_google",
      ];
      cookies.forEach((c) => {
        document.cookie = `${c}=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
      });
    }
  } catch {}

  // 3. Reset streak in-memory cache
  try {
    resetStreakStats();
  } catch {}

  // 4. Clear all user, Elo, streak, and puzzle localStorage keys
  try {
    const keysToRemove = [
      "chessreels_user_stats_v1",
      "quota_last_check",
      "chess_reel_tier_config",
      "chess_reel_account",
      "chess_reel_user_elo",
      "chess_reel_elo",
      "chess_reel_target_elo",
      "chess_reel_peak_elo",
      "chess_reel_best_streak",
      "chess_reel_daily_streak",
      "chess_reel_streak_data",
      "chess_reel_last_played_date",
      "chess_reel_solve_combo",
      "chess_reel_best_combo",
      "chess_reel_total_solved",
      "chess_reel_total_failed",
      "chess_reel_solved_puzzles",
      "chess_reel_solved_ids",
      "chess_reel_saved_puzzles",
      "chess_reel_bookmarks",
      "chess_reel_likes",
      "chess_reel_auto_advance",
      "chess_reel_show_coordinates",
      "chess_reel_muted",
      "chess_reel_plan",
      "chess_reel_custom_dp",
      "chess_reel_preview_guest",
      "chess_reel_guest_id",
      "chess_reel_username",
      "chess_reel_last_solved_puzzle",
      "chess_reel_tier_session",
      "chess_reel_tier_session_guest",
      "chess_reel_puzzle_queue",
      "chess_reel_puzzle_rating_history",
      "chess_reel_rated_puzzles",
    ];

    if (userId) {
      keysToRemove.push(getQueueKey(userId));
      keysToRemove.push(`chess_reel_tier_session_${userId}`);
      keysToRemove.push(`chess_reel_bookmarks_${userId}`);
      keysToRemove.push(`chess_reel_puzzle_rating_history_${userId}`);
    }

    keysToRemove.forEach((key) => {
      safeRemoveItem(key);
    });

    // Wildcard removal for any puzzle queues, tier sessions, or bookmarks
    for (let i = window.localStorage.length - 1; i >= 0; i--) {
      const key = window.localStorage.key(i);
      if (
        key &&
        (key.startsWith("chess_reel_puzzle_queue") ||
          key.startsWith("chess_reel_tier_session") ||
          key.startsWith("chess_reel_saved_puzzles") ||
          key.startsWith("chess_reel_bookmarks"))
      ) {
        safeRemoveItem(key);
      }
    }
  } catch (e) {
    console.warn("Error clearing user and puzzle cache:", e);
  }

  // 5. Notify all listeners
  try {
    window.dispatchEvent(new Event("account-updated"));
    window.dispatchEvent(new Event("plan-updated"));
    window.dispatchEvent(new Event("tier-session-updated"));
  } catch {}
}
