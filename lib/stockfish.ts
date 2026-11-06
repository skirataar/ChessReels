"use client";

import { Chess } from "chess.js";

/**
 * Lightweight client-side Stockfish bridge.
 *
 * - The engine lives in `public/engine/stockfish.js` (+ `stockfish.wasm`) and is
 *   only ever instantiated in the browser, so SSR/prerendering is untouched.
 * - A single worker is shared by every caller (module-level singleton) and UCI
 *   searches are serialised through a promise queue. That keeps the main thread
 *   free and prevents two board cards from interleaving UCI output.
 */

export type EngineScoreType = "cp" | "mate";

export interface EngineScore {
  type: EngineScoreType;
  /** Centipawns for `cp`, moves-to-mate for `mate` (engine/side-to-move POV). */
  value: number;
}

export interface EngineAnalysis {
  /** Best move in strict UCI (`e2e4`, `e7e8q`) or `null` for no legal move. */
  bestMove: string | null;
  score: EngineScore | null;
  depth: number;
  pv: string[];
}

export type MoveVerdict = "solved" | "valid" | "invalid" | "unavailable";

export interface MoveEvaluation {
  verdict: MoveVerdict;
  playedUci: string;
  /** Engine best move in the position before the user's move. */
  bestMove: string | null;
  /** Engine best reply in the position after the user's move. */
  opponentReply: string | null;
  /** Score after the user's move, from the *player's* perspective. */
  playedScore: EngineScore | null;
  /** Best score in the pre-move position, from the player's perspective. */
  bestScore: EngineScore | null;
  /** Positive when the player is delivering mate. */
  mateInForPlayer: number | null;
  isImmediateCheckmate: boolean;
}

const ENGINE_URL = "/engine/stockfish.js";
const DEFAULT_DEPTH = 10;
const DECISIVE_CENTIPAWNS = 280;
const BEST_MOVE_TOLERANCE = 50;
const INIT_TIMEOUT_MS = 20_000;
const SEARCH_TIMEOUT_MS = 20_000;

const UCI_MOVE_RE = /^[a-h][1-8][a-h][1-8][qrbn]?$/i;

function normaliseUci(uci: string | null | undefined): string | null {
  if (!uci) return null;
  const clean = uci.trim().toLowerCase();
  return UCI_MOVE_RE.test(clean) ? clean : null;
}

function parseBestMove(line: string): string | null {
  const match = /^bestmove\s+(\S+)/i.exec(line.trim());
  if (!match) return null;
  // "bestmove (none)" / "bestmove 0000" mean there is no legal move.
  if (match[1] === "(none)" || match[1] === "0000") return null;
  return normaliseUci(match[1]);
}

class StockfishClient {
  private worker: Worker | null = null;
  private initPromise: Promise<boolean> | null = null;
  private ready = false;
  private queue: Promise<unknown> = Promise.resolve();
  private lineListeners = new Set<(line: string) => void>();

  /** Same-origin worker; never constructed during SSR. */
  private createWorker(): Worker | null {
    if (typeof window === "undefined" || typeof Worker === "undefined") {
      return null;
    }
    try {
      return new Worker(ENGINE_URL);
    } catch (error) {
      console.warn("[stockfish] Failed to create worker", error);
      return null;
    }
  }

  private handleMessage = (event: MessageEvent) => {
    const data = typeof event.data === "string" ? event.data : "";
    if (!data) return;
    for (const listener of Array.from(this.lineListeners)) {
      try {
        listener(data);
      } catch {
        // A broken listener must never stall the UCI stream.
      }
    }
  };

  private waitForLine(
    predicate: (line: string) => boolean,
    timeoutMs: number
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.lineListeners.delete(handler);
        reject(new Error("stockfish timeout"));
      }, timeoutMs);

      const handler = (line: string) => {
        if (!predicate(line)) return;
        clearTimeout(timer);
        this.lineListeners.delete(handler);
        resolve(line);
      };

      this.lineListeners.add(handler);
    });
  }

  private ensureReady(): Promise<boolean> {
    if (this.ready && this.worker) return Promise.resolve(true);
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      const worker = this.createWorker();
      if (!worker) return false;

      this.worker = worker;
      worker.onmessage = this.handleMessage;
      worker.onerror = () => {
        this.ready = false;
      };

      try {
        const uciOk = this.waitForLine(
          (line) => line.trim() === "uciok",
          INIT_TIMEOUT_MS
        );
        worker.postMessage("uci");
        await uciOk;

        // Depth-10 tactical checks are plenty; keep memory/CPU tiny.
        // NOTE: this single-threaded build hangs on `setoption name Threads`,
        // so leave the (already 1) default untouched.
        worker.postMessage("setoption name Hash value 16");
        worker.postMessage("setoption name Skill Level value 20");
        worker.postMessage("setoption name UCI_AnalyseMode value true");

        const readyOk = this.waitForLine(
          (line) => line.trim() === "readyok",
          INIT_TIMEOUT_MS
        );
        worker.postMessage("isready");
        await readyOk;

        this.ready = true;
        return true;
      } catch (error) {
        console.warn("[stockfish] Engine initialisation failed", error);
        this.terminate();
        return false;
      }
    })();

    return this.initPromise;
  }

  private enqueue<T>(task: () => Promise<T>): Promise<T> {
    const run = this.queue.then(task, task);
    this.queue = run.then(
      () => undefined,
      () => undefined
    );
    return run;
  }

  terminate() {
    if (this.worker) {
      try {
        this.worker.terminate();
      } catch {
        // ignore
      }
    }
    this.worker = null;
    this.ready = false;
    this.initPromise = null;
    this.lineListeners.clear();
  }

  /** Serialised `position + go depth N` search. */
  analyze(fen: string, depth = DEFAULT_DEPTH): Promise<EngineAnalysis | null> {
    return this.enqueue(async () => {
      const ok = await this.ensureReady();
      if (!ok || !this.worker) return null;

      const worker = this.worker;
      let lastScore: EngineScore | null = null;
      let lastDepth = 0;
      let lastPv: string[] = [];

      const infoListener = (line: string) => {
        if (!line.startsWith("info ")) return;

        const depthMatch = /(?:^|\s)depth (\d+)/.exec(line);
        if (depthMatch) lastDepth = Number(depthMatch[1]);

        const scoreMatch = /(?:^|\s)score (cp|mate) (-?\d+)/.exec(line);
        if (scoreMatch) {
          lastScore = {
            type: scoreMatch[1] as EngineScoreType,
            value: Number(scoreMatch[2]),
          };
        }

        const pvMatch = /(?:^|\s)pv (.+)$/.exec(line);
        if (pvMatch) lastPv = pvMatch[1].trim().split(/\s+/);
      };

      this.lineListeners.add(infoListener);

      try {
        // Make sure a previously interrupted search cannot leak a stale
        // `bestmove` into this request.
        worker.postMessage("stop");
        worker.postMessage("ucinewgame");
        worker.postMessage("position fen " + fen);
        const bestMovePromise = this.waitForLine(
          (line) => line.startsWith("bestmove"),
          SEARCH_TIMEOUT_MS
        );
        worker.postMessage(`go depth ${depth}`);

        const bestMoveLine = await bestMovePromise;
        return {
          bestMove: parseBestMove(bestMoveLine),
          score: lastScore,
          depth: lastDepth,
          pv: lastPv,
        };
      } catch (error) {
        // A timeout leaves the engine in an unknown state; recycle it so the
        // next request starts from a clean singleton.
        console.warn("[stockfish] Search failed", error);
        this.terminate();
        return null;
      } finally {
        this.lineListeners.delete(infoListener);
      }
    });
  }
}

let singleton: StockfishClient | null = null;

function getClient(): StockfishClient {
  if (!singleton) singleton = new StockfishClient();
  return singleton;
}

/** UCI best move for a FEN, or `null` if the engine is unavailable. */
export async function getBestMoveFromStockfish(
  fen: string,
  depth = DEFAULT_DEPTH
): Promise<string | null> {
  if (!fen) return null;
  const analysis = await getClient().analyze(fen, depth);
  return analysis?.bestMove ?? null;
}

/** Full depth-10 analysis, exposed for hints/diagnostics. */
export async function analyzePosition(
  fen: string,
  depth = DEFAULT_DEPTH
): Promise<EngineAnalysis | null> {
  if (!fen) return null;
  return getClient().analyze(fen, depth);
}

function fromPlayerPerspective(
  score: EngineScore | null,
  sideToMoveIsPlayer: boolean
): EngineScore | null {
  if (!score) return null;
  const sign = sideToMoveIsPlayer ? 1 : -1;
  return { type: score.type, value: score.value * sign };
}

/**
 * Validates a user's move against the hard-coded solution.
 *
 * Returns:
 *  - `solved`  immediate checkmate (0 legal moves while in check)
 *  - `valid`   a sound alternative that keeps a forced mate or a decisive,
 *              near-best engine evaluation
 *  - `invalid` the move throws the win away
 *  - `unavailable` the engine could not be reached (caller keeps old behaviour)
 */
export async function evaluateMoveWithStockfish(
  fenBeforeMove: string,
  playedUciMove: string,
  fenAfterMove: string,
  depth = DEFAULT_DEPTH
): Promise<MoveEvaluation> {
  const playedUci = normaliseUci(playedUciMove) ?? playedUciMove.toLowerCase();
  const base: MoveEvaluation = {
    verdict: "unavailable",
    playedUci,
    bestMove: null,
    opponentReply: null,
    playedScore: null,
    bestScore: null,
    mateInForPlayer: null,
    isImmediateCheckmate: false,
  };

  if (!fenBeforeMove || !fenAfterMove) return base;

  // 1. Checkmate is immediate and needs no engine round-trip.
  try {
    const after = new Chess(fenAfterMove);
    if (after.isCheckmate()) {
      return {
        ...base,
        verdict: "solved",
        isImmediateCheckmate: true,
        mateInForPlayer: 0,
      };
    }
    if (after.isGameOver()) {
      // Stalemate/draw cannot be a winning puzzle solution.
      return { ...base, verdict: "invalid" };
    }
  } catch {
    return base;
  }

  // 2. Analyse after the move (side to move = opponent).
  const afterAnalysis = await getClient().analyze(fenAfterMove, depth);
  if (!afterAnalysis) return base;

  // 3. Analyse the original position for the engine's best move/score.
  const beforeAnalysis = await getClient().analyze(fenBeforeMove, depth);
  const playedScore = fromPlayerPerspective(afterAnalysis.score, false);
  const bestScore = fromPlayerPerspective(beforeAnalysis?.score ?? null, true);

  const mateInForPlayer =
    playedScore?.type === "mate" && playedScore.value > 0
      ? playedScore.value
      : null;

  const forcedMateForPlayer = mateInForPlayer !== null;

  const decisiveCentipawns =
    playedScore?.type === "cp" ? playedScore.value : null;
  const bestCentipawns = bestScore?.type === "cp" ? bestScore.value : null;
  // If the engine's best line is a forced mate we cannot diff centipawns, so a
  // decisive cp evaluation is enough to treat the alternative as winning.
  const bestIsMateForPlayer =
    bestScore?.type === "mate" && bestScore.value > 0;

  const isDecisive =
    decisiveCentipawns !== null &&
    decisiveCentipawns >= DECISIVE_CENTIPAWNS &&
    (bestIsMateForPlayer ||
      (bestCentipawns !== null &&
        bestCentipawns - decisiveCentipawns <= BEST_MOVE_TOLERANCE));

  const verdict: MoveVerdict =
    forcedMateForPlayer || isDecisive ? "valid" : "invalid";

  return {
    ...base,
    verdict,
    bestMove: beforeAnalysis?.bestMove ?? null,
    opponentReply: afterAnalysis.bestMove ?? null,
    playedScore,
    bestScore,
    mateInForPlayer,
  };
}

/** Test/teardown hook. */
export function disposeStockfish() {
  if (singleton) {
    singleton.terminate();
    singleton = null;
  }
}
