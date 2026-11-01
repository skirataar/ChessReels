import { PuzzleData } from "@/components/PuzzleCard";

const QUEUE_KEY = "chess_reel_puzzle_queue";
const TARGET_BUFFER_SIZE = 5;

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

/**
 * Retrieves the currently queued puzzles from local storage.
 */
export function getStoredQueue(): PuzzleData[] {
  const raw = safeGetItem(QUEUE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as PuzzleData[]) : [];
  } catch {
    return [];
  }
}

/**
 * Saves the puzzle array back to local storage.
 */
export function saveQueue(queue: PuzzleData[]): void {
  safeSetItem(QUEUE_KEY, JSON.stringify(queue));
}

/**
 * Pops the next cached puzzle from the front of the queue.
 */
export function popNextPuzzle(): PuzzleData | null {
  const queue = getStoredQueue();
  if (queue.length === 0) return null;

  const next = queue.shift() ?? null;
  saveQueue(queue);
  return next;
}

/**
 * Prefetches random puzzles around the user's current Elo to top up the buffer.
 */
export async function prefetchPuzzles(
  elo: number,
  targetSize: number = TARGET_BUFFER_SIZE
): Promise<void> {
  if (typeof window !== "undefined" && !window.navigator.onLine) {
    return; // Don't attempt to prefetch when offline
  }

  const currentQueue = getStoredQueue();
  const needed = Math.max(0, targetSize - currentQueue.length);

  if (needed <= 0) return;

  const existingIds = new Set(currentQueue.map((p) => p.id));
  try {
    const res = await fetch(`/api/puzzle/random?elo=${elo}&count=${needed}`);
    if (res.ok) {
      const data = await res.json();
      const fetched: PuzzleData[] = Array.isArray(data) ? data : [data];
      const newPuzzles = fetched.filter((p) => p && !existingIds.has(p.id));

      if (newPuzzles.length > 0) {
        const updated = [...getStoredQueue(), ...newPuzzles];
        saveQueue(updated);
      }
    }
  } catch (err) {
    console.warn("Failed to prefetch puzzles batch:", err);
  }
}
