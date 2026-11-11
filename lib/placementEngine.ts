import { trackEvent } from "@/lib/analytics";

export interface GuestSession {
  currentStep: number; // 0 to 6
  puzzleHistory: { puzzleId: string; elo: number; passed: boolean }[];
  calibratedElo: number | null;
  isGuestMode: boolean;
  // Convenience fields for backwards compatibility and database sync
  solvedCount?: number;
  estimatedElo?: number;
  streak?: number;
  solvedPuzzleIds?: string[];
}

export const PLACEMENT_TOTAL_STEPS = 6;
export const PLACEMENT_START_ELO = 1000;
export const PLACEMENT_STEP_WIN_DELTA = 200;
export const PLACEMENT_STEP_LOSS_DELTA = 150;
export const MIN_PLACEMENT_ELO = 600;
export const MAX_PLACEMENT_ELO = 2200;

export const GUEST_SESSION_KEY = "doomchess_guest_session";

export function calculateNextPlacementElo(currentElo: number, passed: boolean): number {
  const next = passed
    ? currentElo + PLACEMENT_STEP_WIN_DELTA
    : currentElo - PLACEMENT_STEP_LOSS_DELTA;
  return Math.max(MIN_PLACEMENT_ELO, Math.min(MAX_PLACEMENT_ELO, next));
}

export function calculateFinalPlacementElo(
  history: { puzzleId?: string; elo: number; passed: boolean }[]
): number {
  if (!history || history.length === 0) return PLACEMENT_START_ELO;

  const count = history.length;
  const wins = history.filter((h) => h.passed).length;
  const accuracy = wins / count;

  // Mean difficulty of all attempted placement puzzles
  const avgDifficulty =
    history.reduce((sum, h) => sum + (typeof h.elo === "number" ? h.elo : PLACEMENT_START_ELO), 0) /
    count;

  // Net solve accuracy adjustment: +/- up to 200 points relative to 50% baseline
  const accuracyBonus = (accuracy - 0.5) * 400;

  let rawElo = avgDifficulty + accuracyBonus;

  // Performance ceiling / floor reinforcement
  if (wins === count) {
    const maxElo = Math.max(...history.map((h) => h.elo || PLACEMENT_START_ELO));
    rawElo = Math.max(rawElo, maxElo + 100);
  } else if (wins === 0) {
    const minElo = Math.min(...history.map((h) => h.elo || PLACEMENT_START_ELO));
    rawElo = Math.min(rawElo, minElo - 100);
  }

  // Strict clamp between 600 and 2200 ELO
  const clamped = Math.max(MIN_PLACEMENT_ELO, Math.min(MAX_PLACEMENT_ELO, rawElo));

  // Round to the nearest 25
  return Math.round(clamped / 25) * 25;
}

export function getDefaultGuestSession(): GuestSession {
  return {
    currentStep: 0,
    puzzleHistory: [],
    calibratedElo: null,
    isGuestMode: false,
    solvedCount: 0,
    estimatedElo: PLACEMENT_START_ELO,
    streak: 0,
    solvedPuzzleIds: [],
  };
}

export function getGuestSession(): GuestSession {
  if (typeof window === "undefined") return getDefaultGuestSession();
  try {
    const raw = window.localStorage.getItem(GUEST_SESSION_KEY);
    if (!raw) return getDefaultGuestSession();
    const parsed = JSON.parse(raw);

    const history: { puzzleId: string; elo: number; passed: boolean }[] = Array.isArray(
      parsed.puzzleHistory
    )
      ? parsed.puzzleHistory.map((item: any) => ({
          puzzleId: String(item.puzzleId || ""),
          elo: typeof item.elo === "number" ? item.elo : PLACEMENT_START_ELO,
          passed: Boolean(item.passed),
        }))
      : [];

    return {
      currentStep: typeof parsed.currentStep === "number" ? parsed.currentStep : history.length,
      puzzleHistory: history,
      calibratedElo: typeof parsed.calibratedElo === "number" ? parsed.calibratedElo : null,
      isGuestMode: Boolean(parsed.isGuestMode),
      solvedCount: typeof parsed.solvedCount === "number" ? parsed.solvedCount : history.filter((h) => h.passed).length,
      estimatedElo:
        typeof parsed.estimatedElo === "number" ? parsed.estimatedElo : PLACEMENT_START_ELO,
      streak: typeof parsed.streak === "number" ? parsed.streak : 0,
      solvedPuzzleIds: Array.isArray(parsed.solvedPuzzleIds) ? parsed.solvedPuzzleIds : [],
    };
  } catch {
    return getDefaultGuestSession();
  }
}

export function saveGuestSession(data: Partial<GuestSession>): GuestSession {
  const existing = getGuestSession();
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

export function markGuestMode(isGuest: boolean = true): GuestSession {
  return saveGuestSession({ isGuestMode: isGuest });
}

export function clearGuestSession(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(GUEST_SESSION_KEY);
  } catch {}
}

export function recordPlacementStep(
  puzzleId: string,
  elo: number,
  passed: boolean
): {
  session: GuestSession;
  isComplete: boolean;
  finalElo: number | null;
  nextElo: number;
} {
  const current = getGuestSession();
  const updatedHistory = [
    ...current.puzzleHistory,
    { puzzleId, elo: Math.round(elo), passed },
  ];
  const nextStep = Math.min(PLACEMENT_TOTAL_STEPS, current.currentStep + 1);
  const nextSolvedCount = passed ? (current.solvedCount || 0) + 1 : (current.solvedCount || 0);
  const nextStreak = passed ? (current.streak || 0) + 1 : 0;
  const nextPuzzleIds =
    passed && puzzleId && !current.solvedPuzzleIds?.includes(puzzleId)
      ? [...(current.solvedPuzzleIds || []), puzzleId]
      : current.solvedPuzzleIds || [];

  const isComplete = nextStep >= PLACEMENT_TOTAL_STEPS;
  let finalElo: number | null = null;
  let nextElo: number;

  if (isComplete) {
    finalElo = calculateFinalPlacementElo(updatedHistory);
    nextElo = finalElo;
  } else {
    nextElo = calculateNextPlacementElo(elo, passed);
  }

  const updatedSession: GuestSession = {
    ...current,
    currentStep: nextStep,
    puzzleHistory: updatedHistory,
    calibratedElo: isComplete ? finalElo : current.calibratedElo,
    estimatedElo: nextElo,
    solvedCount: nextSolvedCount,
    streak: nextStreak,
    solvedPuzzleIds: nextPuzzleIds,
  };

  saveGuestSession(updatedSession);

  return {
    session: updatedSession,
    isComplete,
    finalElo,
    nextElo,
  };
}

export async function syncGuestSessionToAccount(userId: string): Promise<boolean> {
  const session = getGuestSession();
  if (
    !session ||
    (session.puzzleHistory.length === 0 && (!session.solvedCount || session.solvedCount === 0))
  ) {
    clearGuestSession();
    return false;
  }

  try {
    const res = await fetch("/api/user/sync-guest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId,
        estimatedElo: session.calibratedElo || session.estimatedElo,
        calibratedElo: session.calibratedElo,
        isCalibrated: Boolean(session.calibratedElo || session.currentStep >= PLACEMENT_TOTAL_STEPS),
        calibrationStep: session.currentStep,
        solvedCount: session.solvedCount,
        streak: session.streak,
        solvedPuzzleIds: session.solvedPuzzleIds,
        puzzleHistory: session.puzzleHistory,
      }),
    });

    if (res.ok) {
      trackEvent("signup_completed", {
        initialElo: session.calibratedElo || session.estimatedElo,
        calibratedElo: session.calibratedElo,
        source: "placement_calibration",
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
