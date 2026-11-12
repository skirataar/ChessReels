import { trackEvent } from "@/lib/analytics";

export interface PlacementStepResult {
  puzzleId: string;
  puzzleElo: number;
  solved: boolean;
}

export interface PlacementState {
  currentStep: number; // 1 to 6
  currentPuzzleElo: number;
  history: PlacementStepResult[];
  calibratedElo: number | null;
  isComplete: boolean;
}

export const INITIAL_PLACEMENT_ELO = 1000;
export const TOTAL_PLACEMENT_STEPS = 6;
export const ELO_STEP_UP = 150;
export const ELO_STEP_DOWN = 100;
export const MIN_CALIBRATED_ELO = 600;
export const MAX_CALIBRATED_ELO = 2200;

export const GUEST_SESSION_KEY = "doomchess_guest_session";

// Backwards compatibility aliases
export const PLACEMENT_START_ELO = INITIAL_PLACEMENT_ELO;
export const PLACEMENT_TOTAL_STEPS = TOTAL_PLACEMENT_STEPS;
export const PLACEMENT_STEP_WIN_DELTA = ELO_STEP_UP;
export const PLACEMENT_STEP_LOSS_DELTA = ELO_STEP_DOWN;
export const MIN_PLACEMENT_ELO = MIN_CALIBRATED_ELO;
export const MAX_PLACEMENT_ELO = MAX_CALIBRATED_ELO;

export interface GuestSession extends PlacementState {
  isGuestMode: boolean;
  estimatedElo?: number;
  solvedCount?: number;
  streak?: number;
  solvedPuzzleIds?: string[];
  puzzleHistory?: { puzzleId: string; elo: number; passed: boolean }[];
}

export function getInitialPlacementState(): PlacementState {
  return {
    currentStep: 1,
    currentPuzzleElo: INITIAL_PLACEMENT_ELO,
    history: [],
    calibratedElo: null,
    isComplete: false,
  };
}

export function processPlacementMove(
  state: PlacementState,
  puzzleId: string,
  solved: boolean
): PlacementState {
  if (state.isComplete || state.history.length >= TOTAL_PLACEMENT_STEPS) {
    return {
      ...state,
      currentStep: TOTAL_PLACEMENT_STEPS,
      history: state.history.slice(0, TOTAL_PLACEMENT_STEPS),
      calibratedElo: state.calibratedElo ?? state.currentPuzzleElo,
      isComplete: true,
    };
  }

  // Idempotency: puzzle already in history
  if (state.history.some((h) => h.puzzleId === puzzleId)) {
    return state;
  }

  // Single transparent running rating: +150 on solve, -100 on fail
  const nextElo = solved
    ? Math.min(MAX_CALIBRATED_ELO, state.currentPuzzleElo + ELO_STEP_UP)
    : Math.max(MIN_CALIBRATED_ELO, state.currentPuzzleElo - ELO_STEP_DOWN);

  const stepResult: PlacementStepResult = {
    puzzleId,
    puzzleElo: state.currentPuzzleElo,
    solved,
  };

  const newHistory = [...state.history, stepResult];

  // Derive step directly from history length
  if (newHistory.length >= TOTAL_PLACEMENT_STEPS) {
    // Calibration Complete: calibratedElo is exactly the final running currentElo reached after step 6!
    return {
      currentStep: TOTAL_PLACEMENT_STEPS,
      currentPuzzleElo: nextElo,
      history: newHistory,
      calibratedElo: nextElo,
      isComplete: true,
    };
  }

  // Next step puzzle target
  return {
    currentStep: Math.min(TOTAL_PLACEMENT_STEPS, newHistory.length + 1),
    currentPuzzleElo: nextElo,
    history: newHistory,
    calibratedElo: null,
    isComplete: false,
  };
}

export function calculateNextPlacementElo(currentElo: number, passed: boolean): number {
  const next = passed ? currentElo + ELO_STEP_UP : currentElo - ELO_STEP_DOWN;
  return Math.max(MIN_CALIBRATED_ELO, Math.min(MAX_CALIBRATED_ELO, next));
}

export function calculateFinalPlacementElo(
  history: { puzzleId?: string; elo?: number; puzzleElo?: number; passed?: boolean; solved?: boolean }[]
): number {
  if (!history || history.length === 0) return INITIAL_PLACEMENT_ELO;
  let running = INITIAL_PLACEMENT_ELO;
  for (const item of history) {
    const passed = item.solved !== undefined ? item.solved : Boolean(item.passed);
    running = passed
      ? Math.min(MAX_CALIBRATED_ELO, running + ELO_STEP_UP)
      : Math.max(MIN_CALIBRATED_ELO, running - ELO_STEP_DOWN);
  }
  return running;
}

export function getDefaultGuestSession(): GuestSession {
  const initial = getInitialPlacementState();
  return {
    ...initial,
    isGuestMode: false,
    estimatedElo: initial.currentPuzzleElo,
    solvedCount: 0,
    streak: 0,
    solvedPuzzleIds: [],
    puzzleHistory: [],
  };
}

export function getGuestSession(): GuestSession {
  if (typeof window === "undefined") return getDefaultGuestSession();
  try {
    const raw = window.localStorage.getItem(GUEST_SESSION_KEY);
    if (!raw) return getDefaultGuestSession();
    const parsed = JSON.parse(raw);

    let history: PlacementStepResult[] = [];
    if (Array.isArray(parsed.history)) {
      history = parsed.history.map((h: any) => ({
        puzzleId: String(h.puzzleId || ""),
        puzzleElo: typeof h.puzzleElo === "number" ? h.puzzleElo : (typeof h.elo === "number" ? h.elo : INITIAL_PLACEMENT_ELO),
        solved: Boolean(h.solved !== undefined ? h.solved : h.passed),
      }));
    } else if (Array.isArray(parsed.puzzleHistory)) {
      history = parsed.puzzleHistory.map((h: any) => ({
        puzzleId: String(h.puzzleId || ""),
        puzzleElo: typeof h.elo === "number" ? h.elo : INITIAL_PLACEMENT_ELO,
        solved: Boolean(h.passed !== undefined ? h.passed : h.solved),
      }));
    }

    const historyLength = history.length;
    const calibratedElo = typeof parsed.calibratedElo === "number" ? parsed.calibratedElo : null;
    const isComplete = Boolean(
      parsed.isComplete || calibratedElo !== null || historyLength >= TOTAL_PLACEMENT_STEPS
    );
    const currentStep = isComplete
      ? TOTAL_PLACEMENT_STEPS
      : Math.min(TOTAL_PLACEMENT_STEPS, historyLength + 1);

    const currentPuzzleElo =
      typeof parsed.currentPuzzleElo === "number"
        ? parsed.currentPuzzleElo
        : (typeof parsed.estimatedElo === "number" ? parsed.estimatedElo : INITIAL_PLACEMENT_ELO);

    const effectiveCalibratedElo = isComplete ? (calibratedElo ?? currentPuzzleElo) : null;
    const solves = history.filter((h) => h.solved).length;

    return {
      currentStep,
      currentPuzzleElo,
      history,
      calibratedElo: effectiveCalibratedElo,
      isComplete,
      isGuestMode: Boolean(parsed.isGuestMode),
      estimatedElo: effectiveCalibratedElo || currentPuzzleElo,
      solvedCount: solves,
      streak: typeof parsed.streak === "number" ? parsed.streak : 0,
      solvedPuzzleIds: Array.isArray(parsed.solvedPuzzleIds)
        ? parsed.solvedPuzzleIds
        : history.filter((h) => h.solved).map((h) => h.puzzleId),
      puzzleHistory: history.map((h) => ({ puzzleId: h.puzzleId, elo: h.puzzleElo, passed: h.solved })),
    };
  } catch {
    return getDefaultGuestSession();
  }
}

export function loadPlacementStateFromStorage(): PlacementState {
  const session = getGuestSession();
  const history = session.history || [];
  const isComplete = Boolean(
    session.isComplete ||
    session.calibratedElo !== null ||
    history.length >= TOTAL_PLACEMENT_STEPS
  );
  const currentStep = isComplete
    ? TOTAL_PLACEMENT_STEPS
    : Math.min(TOTAL_PLACEMENT_STEPS, history.length + 1);

  return {
    currentStep,
    currentPuzzleElo: session.currentPuzzleElo || INITIAL_PLACEMENT_ELO,
    history,
    calibratedElo: isComplete ? (session.calibratedElo ?? session.currentPuzzleElo) : null,
    isComplete,
  };
}

export function savePlacementStateToStorage(state: PlacementState): GuestSession {
  const isComplete = Boolean(
    state.isComplete ||
    state.calibratedElo !== null ||
    state.history.length >= TOTAL_PLACEMENT_STEPS
  );
  const currentStep = isComplete
    ? TOTAL_PLACEMENT_STEPS
    : Math.min(TOTAL_PLACEMENT_STEPS, state.history.length + 1);

  return saveGuestSession({
    ...state,
    currentStep,
    isComplete,
    calibratedElo: isComplete ? (state.calibratedElo ?? state.currentPuzzleElo) : null,
    estimatedElo: state.calibratedElo || state.currentPuzzleElo,
  });
}

export function saveGuestSession(data: Partial<GuestSession>): GuestSession {
  const existing = getGuestSession();
  const updated: GuestSession = {
    ...existing,
    ...data,
  };

  if (data.history) {
    updated.puzzleHistory = data.history.map((h) => ({
      puzzleId: h.puzzleId,
      elo: h.puzzleElo,
      passed: h.solved,
    }));
    updated.solvedCount = data.history.filter((h) => h.solved).length;
    updated.solvedPuzzleIds = data.history.filter((h) => h.solved).map((h) => h.puzzleId);
    const isNowComplete = Boolean(
      updated.isComplete || data.isComplete || data.history.length >= TOTAL_PLACEMENT_STEPS
    );
    updated.isComplete = isNowComplete;
    updated.currentStep = isNowComplete
      ? TOTAL_PLACEMENT_STEPS
      : Math.min(TOTAL_PLACEMENT_STEPS, data.history.length + 1);
    if (isNowComplete && !updated.calibratedElo) {
      updated.calibratedElo = updated.currentPuzzleElo;
    }
  }
  if (data.currentPuzzleElo !== undefined) {
    updated.estimatedElo = data.currentPuzzleElo;
  }
  if (data.calibratedElo !== undefined) {
    updated.estimatedElo = data.calibratedElo || updated.currentPuzzleElo;
  }

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
  _elo: number,
  passed: boolean
): {
  session: GuestSession;
  isComplete: boolean;
  finalElo: number | null;
  nextElo: number;
} {
  const current = getGuestSession();
  const nextState = processPlacementMove(current, puzzleId, passed);
  const updatedSession = saveGuestSession({
    ...nextState,
    isGuestMode: current.isGuestMode,
  });

  return {
    session: updatedSession,
    isComplete: nextState.isComplete,
    finalElo: nextState.calibratedElo,
    nextElo: nextState.isComplete
      ? (nextState.calibratedElo ?? nextState.currentPuzzleElo)
      : nextState.currentPuzzleElo,
  };
}

export async function syncGuestSessionToAccount(userId: string): Promise<boolean> {
  const session = getGuestSession();
  if (
    !session ||
    (session.history.length === 0 && !session.calibratedElo && (!session.solvedCount || session.solvedCount === 0))
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
        estimatedElo: session.calibratedElo || session.currentPuzzleElo,
        calibratedElo: session.calibratedElo,
        isCalibrated: Boolean(session.isComplete || session.calibratedElo),
        calibrationStep: session.currentStep,
        solvedCount: session.solvedCount,
        streak: session.streak,
        solvedPuzzleIds: session.solvedPuzzleIds,
        puzzleHistory: session.puzzleHistory,
      }),
    });

    if (res.ok) {
      trackEvent("signup_completed", {
        initialElo: session.calibratedElo || session.currentPuzzleElo,
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
