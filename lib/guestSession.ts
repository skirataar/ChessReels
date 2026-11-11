import { trackEvent } from "@/lib/analytics";

export interface GuestSession {
  solvedCount: number;
  estimatedElo: number;
  streak: number;
  solvedPuzzleIds?: string[];
}

export const GUEST_SESSION_KEY = "doomchess_guest_session";
export const DEFAULT_GUEST_ELO = 1000;

export function getGuestSession(): GuestSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(GUEST_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return {
      solvedCount: typeof parsed.solvedCount === "number" ? parsed.solvedCount : 0,
      estimatedElo: typeof parsed.estimatedElo === "number" ? parsed.estimatedElo : DEFAULT_GUEST_ELO,
      streak: typeof parsed.streak === "number" ? parsed.streak : 0,
      solvedPuzzleIds: Array.isArray(parsed.solvedPuzzleIds) ? parsed.solvedPuzzleIds : [],
    };
  } catch {
    return null;
  }
}

export function saveGuestSession(data: Partial<GuestSession>): GuestSession {
  const existing = getGuestSession() || {
    solvedCount: 0,
    estimatedElo: DEFAULT_GUEST_ELO,
    streak: 0,
    solvedPuzzleIds: [],
  };

  const updated: GuestSession = {
    ...existing,
    ...data,
  };

  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(GUEST_SESSION_KEY, JSON.stringify(updated));
    } catch {}
  }

  return updated;
}

export function clearGuestSession(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(GUEST_SESSION_KEY);
  } catch {}
}

export function recordGuestSolve(newElo: number, puzzleId?: string): {
  session: GuestSession;
  justHitFirst: boolean;
  justHitThird: boolean;
} {
  const current = getGuestSession() || {
    solvedCount: 0,
    estimatedElo: DEFAULT_GUEST_ELO,
    streak: 0,
    solvedPuzzleIds: [],
  };

  const nextSolvedCount = current.solvedCount + 1;
  const nextStreak = current.streak + 1;
  const nextPuzzleIds = puzzleId && !current.solvedPuzzleIds?.includes(puzzleId)
    ? [...(current.solvedPuzzleIds || []), puzzleId]
    : (current.solvedPuzzleIds || []);

  const updated: GuestSession = {
    solvedCount: nextSolvedCount,
    estimatedElo: Math.round(newElo),
    streak: nextStreak,
    solvedPuzzleIds: nextPuzzleIds,
  };

  saveGuestSession(updated);

  return {
    session: updated,
    justHitFirst: nextSolvedCount === 1,
    justHitThird: nextSolvedCount === 3,
  };
}

export async function syncGuestSessionToAccount(userId: string): Promise<boolean> {
  const session = getGuestSession();
  if (!session || session.solvedCount === 0) {
    clearGuestSession();
    return false;
  }

  try {
    const res = await fetch("/api/user/sync-guest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId,
        estimatedElo: session.estimatedElo,
        solvedCount: session.solvedCount,
        streak: session.streak,
        solvedPuzzleIds: session.solvedPuzzleIds,
      }),
    });

    if (res.ok) {
      trackEvent("signup_completed", {
        initialElo: session.estimatedElo,
        source: "puzzle_3_wall",
      });
      clearGuestSession();
      return true;
    }
  } catch (err) {
    console.error("Failed to sync guest session to account:", err);
  }

  clearGuestSession();
  return false;
}
