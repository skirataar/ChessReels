"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import dynamic from "next/dynamic";
import { Chess, Square } from "chess.js";
import { sounds } from "@/lib/audio";
import { haptics } from "@/lib/haptics";
import confetti from "canvas-confetti";
import {
  Trophy,
  Flame,
  CheckCircle2,
  AlertCircle,
  XCircle,
  ArrowRight,
  RotateCcw,
  Sparkles,
  Eye,
  Lightbulb,
  Bookmark,
  Volume2,
  VolumeX,
  Share2,
  ArrowUpDown,
  Zap,
  Brain,
  FastForward,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Clock,
  Heart,
  Lock,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import { Chessboard, defaultArrowOptions } from "react-chessboard";
import { useBoardTheme } from "@/lib/boardThemes";

export interface PuzzleData {
  id: string;
  fen: string;
  moves: string;
  rating: number;
  ratingDeviation: number;
  popularity: number;
  nbPlays: number;
  themes: string;
  gameUrl: string;
  openingTags?: string | null;
  likes?: number;
}

export type PuzzleStatus = "loading" | "playing" | "solved" | "failed";

export interface PuzzleCardProps {
  puzzle: PuzzleData | null;
  status: PuzzleStatus;
  currentElo: number;
  guestId?: string;
  streak?: number;
  combo?: number;
  lastEloChange: number | null;
  isCalibration?: boolean;
  calibrationStep?: number;
  mode?: "ranked" | "practice";
  isPro?: boolean;
  canPlay?: boolean;
  isPaywallOpen?: boolean;
  canGoPrev?: boolean;
  currentIndex?: number;
  slideDirection?: "next" | "prev";
  onModeChange?: (mode: "ranked" | "practice") => void;
  onStatusChange: (status: PuzzleStatus) => void;
  onEloUpdate: (newElo: number, change: number, isWin?: boolean) => void;
  onNextPuzzle: () => void;
  onPrevPuzzle?: () => void;
  onOpenStats?: () => void;
}

export function computePuzzleInitialState(puzzle: PuzzleData | null | undefined) {
  if (!puzzle || !puzzle.fen) {
    return {
      fen: "",
      boardOrientation: "white" as "white" | "black",
      allMoves: [] as string[],
      solutionStartIndex: 0,
      turnMessage: "White to move",
      game: new Chess(),
    };
  }

  const movesArray = puzzle.moves ? puzzle.moves.trim().split(/\s+/) : [];
  let newGame: Chess;
  try {
    newGame = new Chess(puzzle.fen);
  } catch {
    newGame = new Chess();
  }

  const initialTurn = newGame.turn(); // 'w' or 'b'
  let solutionStartIndex = 0;
  let playerColor: "white" | "black" = initialTurn === "w" ? "black" : "white";

  if (movesArray.length % 2 === 0 && movesArray.length > 0) {
    playerColor = initialTurn === "w" ? "black" : "white";
    const opponentUci = movesArray[0];
    try {
      newGame.move({
        from: opponentUci.slice(0, 2),
        to: opponentUci.slice(2, 4),
        promotion: opponentUci.length === 5 ? opponentUci[4] : undefined,
      });
      solutionStartIndex = 1;
    } catch {}
  } else {
    playerColor = initialTurn === "w" ? "white" : "black";
    solutionStartIndex = 0;
  }

  return {
    fen: newGame.fen(),
    boardOrientation: playerColor,
    allMoves: movesArray,
    solutionStartIndex,
    turnMessage: `${playerColor === "white" ? "White" : "Black"} to move`,
    game: newGame,
  };
}

export function getPuzzleTagline(puzzle: PuzzleData | null | undefined, turn?: "white" | "black"): string {
  if (!puzzle) {
    return "Find the winning move";
  }

  const themes = (puzzle.themes || "").toLowerCase();
  if (themes.includes("matein1")) return "Mate in 1 • Knockout blow";
  if (themes.includes("matein2")) return "Mate in 2 • Forced checkmate";
  if (themes.includes("matein3") || themes.includes("matein4")) return "Checkmate Net • Trap the king";
  if (themes.includes("fork")) return "Double Attack • Royal fork";
  if (themes.includes("pin")) return "Lethal Pin • Paralyze defender";
  if (themes.includes("skewer")) return "Brutal Skewer • Pierce defense";
  if (themes.includes("hangingpiece")) return "Tactical Alert • Loose piece";
  if (themes.includes("discoveredattack")) return "Discovered Check • Hidden strike";
  if (themes.includes("backrankmate")) return "Back Rank • Trap on 8th rank";
  if (themes.includes("endgame")) return "Endgame • Convert technical win";
  if (themes.includes("crushing")) return "Crushing Blow • Decisive advantage";
  if (puzzle.openingTags) return `${puzzle.openingTags} • Spot tactic`;

  return "Find the winning move";
}

export function useIsDesktopPointer(): boolean {
  const [isDesktopPointer, setIsDesktopPointer] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(pointer: fine) and (min-width: 768px)").matches;
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mediaQuery = window.matchMedia("(pointer: fine) and (min-width: 768px)");
    const handler = (e: MediaQueryListEvent) => {
      setIsDesktopPointer(e.matches);
    };
    setIsDesktopPointer(mediaQuery.matches);
    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, []);

  return isDesktopPointer;
}

export function PuzzleCard({
  puzzle,
  status,
  currentElo,
  guestId,
  streak = 0,
  combo = 0,
  lastEloChange,
  isCalibration = false,
  calibrationStep = 1,
  mode = "ranked",
  isPro = false,
  canPlay = true,
  isPaywallOpen = false,
  canGoPrev = false,
  currentIndex,
  slideDirection = "next",
  onModeChange,
  onStatusChange,
  onEloUpdate,
  onNextPuzzle,
  onPrevPuzzle,
  onOpenStats,
}: PuzzleCardProps) {
  const isDesktopPointer = useIsDesktopPointer();
  const [boardTheme] = useBoardTheme();
  const initialPuzzleState = computePuzzleInitialState(puzzle);
  const [fen, setFen] = useState<string>(initialPuzzleState.fen);
  // Move history for stepping back (<) and forward (>) through current puzzle moves
  const [moveHistory, setMoveHistory] = useState<string[]>(() => [initialPuzzleState.fen]);
  const [viewMoveIndex, setViewMoveIndex] = useState<number>(0);
  const displayFen = moveHistory[viewMoveIndex] ?? fen;

  const handleStepBack = useCallback(() => {
    haptics.tap();
    setTouchArrows([]);
    setSelectedSquare(null);
    setHighlightStyles({});
    setViewMoveIndex((prev) => Math.max(0, prev - 1));
  }, []);

  const handleStepForward = useCallback(() => {
    haptics.tap();
    setTouchArrows([]);
    setSelectedSquare(null);
    setHighlightStyles({});
    setViewMoveIndex((prev) => Math.min(moveHistory.length - 1, prev + 1));
  }, [moveHistory.length]);
  const [boardOrientation, setBoardOrientation] = useState<"white" | "black">(
    initialPuzzleState.boardOrientation
  );
  const [solutionStartIndex, setSolutionStartIndex] = useState<number>(
    initialPuzzleState.solutionStartIndex
  );
  const [currentMoveIndex, setCurrentMoveIndex] = useState<number>(
    initialPuzzleState.solutionStartIndex
  );
  const [allMoves, setAllMoves] = useState<string[]>(initialPuzzleState.allMoves);
  const [playerTurnMessage, setPlayerTurnMessage] = useState<string>(
    initialPuzzleState.turnMessage
  );
  const [mistakeFeedback, setMistakeFeedback] = useState<string | null>(null);
  const [isShaking, setIsShaking] = useState<boolean>(false);
  const [isFlashingRed, setIsFlashingRed] = useState<boolean>(false);
  const [retryCount, setRetryCount] = useState<number>(0);
  const [autoNextCountdown, setAutoNextCountdown] = useState<number | null>(
    null
  );
  const [isReviewing, setIsReviewing] = useState<boolean>(
    () => Boolean(!canPlay && !isPro && status === "solved")
  );

  // Placement / calibration game feedback and pause timer
  const [placementFeedback, setPlacementFeedback] = useState<"correct" | "incorrect" | null>(null);
  const placementTransitionTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Mode and Timer state
  const [activeMode, setActiveMode] = useState<"ranked" | "practice">(mode);
  const [timerSeconds, setTimerSeconds] = useState<number>(0);

  useEffect(() => {
    setActiveMode(mode);
  }, [mode]);

  // Count-up timer for the current puzzle
  useEffect(() => {
    setTimerSeconds(0);
    if (!puzzle || status !== "playing") return;

    const interval = setInterval(() => {
      setTimerSeconds((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [puzzle?.id, status]);

  const formatTimer = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // UI features: Bookmarking, Likes, SFX mute state, hints, toast feedback
  const [isBookmarked, setIsBookmarked] = useState<boolean>(false);
  const [isLiked, setIsLiked] = useState<boolean>(false);
  const [likesCount, setLikesCount] = useState<number>(() => {
    if (puzzle?.likes !== undefined && puzzle.likes > 0) return puzzle.likes;
    if (!puzzle?.id) return 142;
    let hash = 0;
    for (let i = 0; i < puzzle.id.length; i++) {
      hash = (hash << 5) - hash + puzzle.id.charCodeAt(i);
    }
    return (Math.abs(hash) % 750) + 120;
  });
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [hintActive, setHintActive] = useState<boolean>(false);
  const [hintUsed, setHintUsed] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const isHintGlowing =
    retryCount >= 3 && !hintUsed && (status === "playing" || status === "failed");

  const formatLikes = (num: number): string => {
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + "k";
    }
    return String(num);
  };

  // Click-to-move square highlights
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [highlightStyles, setHighlightStyles] = useState<
    Record<string, React.CSSProperties>
  >({});
  // Board markings (coordinates notation) state
  const [showCoordinates, setShowCoordinates] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    try {
      const stored = window.localStorage.getItem("chess_reel_show_coordinates");
      return stored !== "0";
    } catch {
      return true;
    }
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleCoordUpdate = (e: Event) => {
      const detail = (e as CustomEvent<{ show?: boolean }>).detail;
      if (typeof detail?.show === "boolean") {
        setShowCoordinates(detail.show);
      } else {
        const stored = window.localStorage.getItem("chess_reel_show_coordinates");
        setShowCoordinates(stored !== "0");
      }
    };
    window.addEventListener("board-coordinates-updated", handleCoordUpdate);
    return () => window.removeEventListener("board-coordinates-updated", handleCoordUpdate);
  }, []);

  // Preference: Auto-advance after solving (defaults to false)
  const [isAutoAdvanceEnabled, setIsAutoAdvanceEnabled] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const syncAuto = () => {
      try {
        const val = window.localStorage.getItem("chess_reel_auto_advance");
        setIsAutoAdvanceEnabled(val === "1" || val === "true");
      } catch {}
    };
    syncAuto();
    window.addEventListener("auto-advance-updated", syncAuto);
    return () => window.removeEventListener("auto-advance-updated", syncAuto);
  }, []);

  const gameRef = useRef<Chess | null>(initialPuzzleState.game);
  const autoNextTimerRef = useRef<NodeJS.Timeout | null>(null);
  const mistakeTimerRef = useRef<NodeJS.Timeout | null>(null);
  const toastTimerRef = useRef<NodeJS.Timeout | null>(null);
  const hasPenalizedRef = useRef<boolean>(false);
  const hasWonRef = useRef<boolean>(false);

  // Stable refs for callbacks & props to prevent puzzle re-initialization loops
  const onStatusChangeRef = useRef(onStatusChange);
  useEffect(() => {
    onStatusChangeRef.current = onStatusChange;
  }, [onStatusChange]);

  const statusRef = useRef(status);
  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  const lastInitializedPuzzleIdRef = useRef<string | null>(null);

  // 7-second idle swipe indicator state
  const [showIdleSwipeIndicator, setShowIdleSwipeIndicator] = useState<boolean>(false);
  const idleTimerRef = useRef<NodeJS.Timeout | null>(null);

  const dismissIdleIndicator = useCallback(() => {
    setShowIdleSwipeIndicator(false);
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
    }
  }, []);

  // Cleanup placement transition timer on unmount
  useEffect(() => {
    return () => {
      if (placementTransitionTimerRef.current) {
        clearTimeout(placementTransitionTimerRef.current);
        placementTransitionTimerRef.current = null;
      }
    };
  }, []);

  // When solved and auto-advance is off, start 7s idle timer
  useEffect(() => {
    if (status !== "solved") {
      dismissIdleIndicator();
      return;
    }

    if (isAutoAdvanceEnabled) {
      dismissIdleIndicator();
      return;
    }

    setShowIdleSwipeIndicator(false);
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
    }
    idleTimerRef.current = setTimeout(() => {
      setShowIdleSwipeIndicator(true);
    }, 7000);

    return () => {
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current);
        idleTimerRef.current = null;
      }
    };
  }, [status, isAutoAdvanceEnabled, isCalibration, puzzle?.id, dismissIdleIndicator]);

  // Test event listener for deterministic status simulation in e2e tests
  useEffect(() => {
    const handleSimulateStatus = (e: Event) => {
      const customEvent = e as CustomEvent<{ status: PuzzleStatus }>;
      if (customEvent.detail?.status) {
        if (customEvent.detail.status === "solved" && puzzle && puzzle.fen && puzzle.moves) {
          const movesArray = puzzle.moves.trim().split(/\s+/);
          const solvedGame = new Chess(puzzle.fen);
          let startIndex = 0;
          if (movesArray.length % 2 === 0 && movesArray.length > 0) {
            try {
              solvedGame.move({
                from: movesArray[0].slice(0, 2),
                to: movesArray[0].slice(2, 4),
                promotion: movesArray[0].length === 5 ? movesArray[0][4].toLowerCase() : undefined,
              });
              startIndex = 1;
            } catch {}
          }
          const history: string[] = [solvedGame.fen()];
          for (let i = startIndex; i < movesArray.length; i++) {
            const uci = movesArray[i];
            if (uci) {
              try {
                solvedGame.move({
                  from: uci.slice(0, 2),
                  to: uci.slice(2, 4),
                  promotion: uci.length === 5 ? uci[4].toLowerCase() : undefined,
                });
                history.push(solvedGame.fen());
              } catch {}
            }
          }
          gameRef.current = solvedGame;
          setFen(solvedGame.fen());
          setMoveHistory(history);
          setViewMoveIndex(history.length - 1);
        }
        if (isCalibration) {
          if (customEvent.detail.status === "solved") {
            setPlacementFeedback("correct");
          } else if (customEvent.detail.status === "failed") {
            setPlacementFeedback("incorrect");
          }
        }
        onStatusChangeRef.current(customEvent.detail.status);
      }
    };
    window.addEventListener("chess-reel-test-status", handleSimulateStatus);
    return () => window.removeEventListener("chess-reel-test-status", handleSimulateStatus);
  }, [isCalibration, puzzle]);

  // Sync bookmark, like, and mute state on puzzle load
  useEffect(() => {
    if (!puzzle || !puzzle.fen || !puzzle.moves) return;
    try {
      const userKey = guestId ? `chess_reel_bookmarks_${guestId}` : "chess_reel_bookmarks";
      const savedBookmarks = localStorage.getItem(userKey) || localStorage.getItem("chess_reel_bookmarks");
      if (savedBookmarks) {
        const ids: string[] = JSON.parse(savedBookmarks);
        setIsBookmarked(ids.includes(puzzle.id));
      }

      const savedLikes = localStorage.getItem("chess_reel_likes");
      if (savedLikes) {
        const ids: string[] = JSON.parse(savedLikes);
        setIsLiked(ids.includes(puzzle.id));
      }

      if (puzzle.likes !== undefined && puzzle.likes > 0) {
        setLikesCount(puzzle.likes);
      } else {
        let hash = 0;
        for (let i = 0; i < puzzle.id.length; i++) {
          hash = (hash << 5) - hash + puzzle.id.charCodeAt(i);
        }
        setLikesCount((Math.abs(hash) % 750) + 120);
      }
    } catch {}
    setIsMuted(sounds.getIsMuted());
  }, [puzzle]);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => {
      setToastMessage(null);
    }, 2000);
  }, []);

  // Send Elo update to server with persistent guestId
  const sendEloResult = useCallback(
    async (result: "win" | "loss") => {
      if (!puzzle) return;

      // Always record puzzle history even during calibration mode
      fetch("/api/user/update-elo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          puzzleRating: puzzle.rating,
          currentUserElo: currentElo,
          result,
          guestId,
          puzzleId: puzzle.id,
          dailyStreak: streak,
        }),
      }).catch(() => {});

      if (isCalibration) {
        onEloUpdate(currentElo, result === "win" ? 1 : -1, result === "win");
        return;
      }

      try {
        const response = await fetch("/api/user/update-elo", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            puzzleRating: puzzle.rating,
            currentUserElo: currentElo,
            result,
            guestId,
            puzzleId: puzzle.id,
            dailyStreak: streak,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          if (typeof data.newElo === "number") {
            onEloUpdate(data.newElo, data.eloChange ?? 0, result === "win");
          } else {
            const delta = result === "win" ? 10 : -10;
            onEloUpdate(currentElo + delta, delta, result === "win");
          }
        } else {
          const delta = result === "win" ? 10 : -10;
          onEloUpdate(currentElo + delta, delta, result === "win");
        }
      } catch (err) {
        console.error("Failed to update Elo:", err);
        const delta = result === "win" ? 10 : -10;
        onEloUpdate(currentElo + delta, delta, result === "win");
      }
    },
    [puzzle, currentElo, guestId, isCalibration, onEloUpdate]
  );

  // Initialize or reset puzzle game state
  const initializePuzzle = useCallback(() => {
    if (!puzzle || !puzzle.fen || !puzzle.moves) return;

    if (autoNextTimerRef.current) {
      clearTimeout(autoNextTimerRef.current);
      autoNextTimerRef.current = null;
    }
    if (mistakeTimerRef.current) {
      clearTimeout(mistakeTimerRef.current);
      mistakeTimerRef.current = null;
    }
    if (placementTransitionTimerRef.current) {
      clearTimeout(placementTransitionTimerRef.current);
      placementTransitionTimerRef.current = null;
    }

    setPlacementFeedback(null);
    setAutoNextCountdown(null);
    setIsReviewing(false);
    setMistakeFeedback(null);
    setIsShaking(false);
    setIsFlashingRed(false);
    setRetryCount(0);
    setSelectedSquare(null);
    setHighlightStyles({});
    setHintActive(false);
    setHintUsed(false);
    hasPenalizedRef.current = false;
    hasWonRef.current = false;

    const movesArray = puzzle.moves.trim().split(/\s+/);
    setAllMoves(movesArray);

    const initialTurn = new Chess(puzzle.fen).turn();
    const playerColor: "white" | "black" =
      movesArray.length % 2 === 0 && movesArray.length > 0
        ? initialTurn === "w" ? "black" : "white"
        : initialTurn === "w" ? "white" : "black";
    setBoardOrientation(playerColor);

    // If puzzle was opened in solved state (e.g. review or replaying solved puzzle)
    if (statusRef.current === "solved") {
      const solvedGame = new Chess(puzzle.fen);
      let startIndex = 0;
      if (movesArray.length % 2 === 0 && movesArray.length > 0) {
        try {
          solvedGame.move({
            from: movesArray[0].slice(0, 2),
            to: movesArray[0].slice(2, 4),
            promotion: movesArray[0].length === 5 ? movesArray[0][4].toLowerCase() : undefined,
          });
          startIndex = 1;
        } catch {}
      }
      const history: string[] = [solvedGame.fen()];
      for (let i = startIndex; i < movesArray.length; i++) {
        const uci = movesArray[i];
        if (uci) {
          try {
            solvedGame.move({
              from: uci.slice(0, 2),
              to: uci.slice(2, 4),
              promotion: uci.length === 5 ? uci[4].toLowerCase() : undefined,
            });
            history.push(solvedGame.fen());
          } catch {}
        }
      }
      gameRef.current = solvedGame;
      setFen(solvedGame.fen());
      setMoveHistory(history);
      setViewMoveIndex(history.length - 1);
      setCurrentMoveIndex(movesArray.length);
      setIsReviewing(true);
      setPlayerTurnMessage("Puzzle Solved");
      return;
    }

    const newGame = new Chess(puzzle.fen);
    gameRef.current = newGame;
    let startIndex = 0;

    // In Lichess format, if moves count is even, moves[0] is opponent's blunder
    if (movesArray.length % 2 === 0 && movesArray.length > 0) {
      setPlayerTurnMessage(
        `${playerColor === "white" ? "White" : "Black"} to move`
      );

      // Apply opponent's blunder move
      const opponentUci = movesArray[0];
      try {
        newGame.move({
          from: opponentUci.slice(0, 2),
          to: opponentUci.slice(2, 4),
          promotion:
            opponentUci.length === 5 ? opponentUci[4] : undefined,
        });
        startIndex = 1;
      } catch (e) {
        console.error("Error playing opponent setup move:", e);
      }
    } else {
      setPlayerTurnMessage(
        `${playerColor === "white" ? "White" : "Black"} to move`
      );
      startIndex = 0;
    }

    setSolutionStartIndex(startIndex);
    setFen(newGame.fen());
    setMoveHistory([newGame.fen()]);
    setViewMoveIndex(0);
    setCurrentMoveIndex(startIndex);
    onStatusChangeRef.current("playing");
  }, [puzzle]);

  // Retry handler: resets board, clears all error states, allows trying again without API refetch
  // QOL: If incorrect on step x+1 (currentMoveIndex > solutionStartIndex), progress up to step x is preserved!
  const handleRetry = useCallback(
    (resetToStartArg?: boolean | unknown) => {
      if (!puzzle || !puzzle.fen || !puzzle.moves) return;
      const resetToStart =
        typeof resetToStartArg === "boolean" ? resetToStartArg : false;
      haptics.tap();

      if (autoNextTimerRef.current) {
        clearTimeout(autoNextTimerRef.current);
        autoNextTimerRef.current = null;
      }
      if (mistakeTimerRef.current) {
        clearTimeout(mistakeTimerRef.current);
        mistakeTimerRef.current = null;
      }

      setAutoNextCountdown(null);
      setIsReviewing(false);
      setMistakeFeedback(null);
      setIsShaking(false);
      setIsFlashingRed(false);
      setSelectedSquare(null);
      setHighlightStyles({});
      setHintActive(false);

      const movesArray = puzzle.moves.trim().split(/\s+/);
      setAllMoves(movesArray);

      // If puzzle is already marked solved (e.g. reviewing previously solved puzzle under paywall):
      if (status === "solved") {
        const initialTurn = new Chess(puzzle.fen).turn();
        const playerColor: "white" | "black" =
          movesArray.length % 2 === 0 && movesArray.length > 0
            ? initialTurn === "w" ? "black" : "white"
            : initialTurn === "w" ? "white" : "black";
        setBoardOrientation(playerColor);

        const solvedGame = new Chess(puzzle.fen);
        let startIndex = 0;
        if (movesArray.length % 2 === 0 && movesArray.length > 0) {
          try {
            solvedGame.move({
              from: movesArray[0].slice(0, 2),
              to: movesArray[0].slice(2, 4),
              promotion: movesArray[0].length === 5 ? movesArray[0][4].toLowerCase() : undefined,
            });
            startIndex = 1;
          } catch {}
        }
        const history: string[] = [solvedGame.fen()];
        for (let i = startIndex; i < movesArray.length; i++) {
          const uci = movesArray[i];
          if (uci) {
            try {
              solvedGame.move({
                from: uci.slice(0, 2),
                to: uci.slice(2, 4),
                promotion: uci.length === 5 ? uci[4].toLowerCase() : undefined,
              });
              history.push(solvedGame.fen());
            } catch (e) {
              console.error("Error replaying solved moves:", e);
            }
          }
        }

        gameRef.current = solvedGame;
        setFen(solvedGame.fen());
        setMoveHistory(history);
        setViewMoveIndex(history.length - 1);
        setCurrentMoveIndex(movesArray.length);
        setIsReviewing(true);
        setPlayerTurnMessage("Puzzle Solved");
        return;
      }

      // QOL Step Preservation:
      // If user made a mistake on step x+1 (currentMoveIndex > solutionStartIndex) and did not explicitly request full restart:
      // restore board state to step x+1, keeping the completed x moves intact!
      if (!resetToStart && currentMoveIndex > solutionStartIndex) {
        const restoredGame = new Chess(puzzle.fen);
        let startIndex = 0;
        if (movesArray.length % 2 === 0 && movesArray.length > 0) {
          try {
            restoredGame.move({
              from: movesArray[0].slice(0, 2),
              to: movesArray[0].slice(2, 4),
              promotion: movesArray[0].length === 5 ? movesArray[0][4].toLowerCase() : undefined,
            });
            startIndex = 1;
          } catch {}
        }
        const history: string[] = [restoredGame.fen()];
        for (let i = startIndex; i < currentMoveIndex; i++) {
          const uci = movesArray[i];
          if (uci) {
            try {
              restoredGame.move({
                from: uci.slice(0, 2),
                to: uci.slice(2, 4),
                promotion: uci.length === 5 ? uci[4].toLowerCase() : undefined,
              });
              history.push(restoredGame.fen());
            } catch (e) {
              console.error("Error replaying move to checkpoint:", e);
            }
          }
        }

        gameRef.current = restoredGame;
        setFen(restoredGame.fen());
        setMoveHistory(history);
        setViewMoveIndex(history.length - 1);
        const playerTurn = restoredGame.turn() === "w" ? "White" : "Black";
        setPlayerTurnMessage(`${playerTurn} to move`);
        onStatusChange("playing");
        return;
      }

      // Otherwise, standard full reset to initial puzzle position (Step 1)
      const newGame = new Chess(puzzle.fen);
      gameRef.current = newGame;

      const initialTurn = newGame.turn();
      let initStartIndex = 0;

      if (movesArray.length % 2 === 0 && movesArray.length > 0) {
        const playerColor: "white" | "black" =
          initialTurn === "w" ? "black" : "white";
        setBoardOrientation(playerColor);
        setPlayerTurnMessage(
          `${playerColor === "white" ? "White" : "Black"} to move`
        );

        const opponentUci = movesArray[0];
        try {
          newGame.move({
            from: opponentUci.slice(0, 2),
            to: opponentUci.slice(2, 4),
            promotion: opponentUci.length === 5 ? opponentUci[4] : undefined,
          });
          initStartIndex = 1;
        } catch (e) {
          console.error("Error playing opponent setup move on retry:", e);
        }
      } else {
        const playerColor: "white" | "black" =
          initialTurn === "w" ? "white" : "black";
        setBoardOrientation(playerColor);
        setPlayerTurnMessage(
          `${playerColor === "white" ? "White" : "Black"} to move`
        );
        initStartIndex = 0;
      }

      setFen(newGame.fen());
      setMoveHistory([newGame.fen()]);
      setViewMoveIndex(0);
      setCurrentMoveIndex(initStartIndex);
      onStatusChange("playing");
    },
    [puzzle, status, currentMoveIndex, solutionStartIndex, onStatusChange, showToast]
  );

  useEffect(() => {
    if (!puzzle || !puzzle.id || !puzzle.fen || !puzzle.moves) return;
    if (lastInitializedPuzzleIdRef.current === puzzle.id) {
      // Board already initialized for this puzzle ID; do not reset on Elo or status changes
      return;
    }
    lastInitializedPuzzleIdRef.current = puzzle.id;
    initializePuzzle();
  }, [puzzle?.id, initializePuzzle]);

  // Handle celebratory confetti and auto-advance timer on solve
  useEffect(() => {
    if (status !== "solved" || isCalibration) return;

    // 1. Triumphant multi-stage Confetti celebration
    try {
      confetti({
        particleCount: 85,
        spread: 75,
        origin: { y: 0.65 },
        colors: ["#4edea3", "#10b981", "#ffb95f", "#38bdf8", "#ec4899"],
      });
      setTimeout(() => {
        confetti({
          particleCount: 45,
          angle: 60,
          spread: 60,
          origin: { x: 0.05, y: 0.7 },
          colors: ["#4edea3", "#ffb95f", "#acedff"],
        });
        confetti({
          particleCount: 45,
          angle: 120,
          spread: 60,
          origin: { x: 0.95, y: 0.7 },
          colors: ["#4edea3", "#ffb95f", "#acedff"],
        });
      }, 260);
    } catch {
      // Audio/canvas fallback
    }

    // 2. If user chooses to review the board, is paywalled, or auto-advance is disabled (default): do not auto-advance
    if (isReviewing || (canPlay === false && !isPro) || isPaywallOpen || !isAutoAdvanceEnabled) {
      if ((canPlay === false && !isPro && !isReviewing) || isPaywallOpen) {
        setIsReviewing(true);
      }
      setAutoNextCountdown(null);
      if (autoNextTimerRef.current) {
        clearTimeout(autoNextTimerRef.current);
        autoNextTimerRef.current = null;
      }
      return;
    }

    // 3. 3-second countdown giving feeling of achievement and control (only when autoAdvance is enabled)
    const timer = setTimeout(() => {
      setAutoNextCountdown(3);
    }, 0);

    const countdownInterval = setInterval(() => {
      setAutoNextCountdown((prev) => {
        if (prev !== null && prev > 1) return prev - 1;
        clearInterval(countdownInterval);
        return null;
      });
    }, 1000);

    autoNextTimerRef.current = setTimeout(() => {
      onNextPuzzle();
    }, 3000);

    return () => {
      clearTimeout(timer);
      clearInterval(countdownInterval);
      if (autoNextTimerRef.current) {
        clearTimeout(autoNextTimerRef.current);
      }
    };
  }, [status, isReviewing, canPlay, isPro, isPaywallOpen, isAutoAdvanceEnabled, onNextPuzzle]);

  // Whenever the user is paywalled or the paywall modal is open, ensure the board is never exited or hidden, and stays in review mode
  useEffect(() => {
    if ((canPlay === false && !isPro) || isPaywallOpen) {
      setIsExiting(false);
      setDragY(0);
      setIsSwiping(false);
      setIsReviewing(true);
      setAutoNextCountdown(null);
      if (autoNextTimerRef.current) {
        clearTimeout(autoNextTimerRef.current);
        autoNextTimerRef.current = null;
      }
    }
  }, [canPlay, isPro, isPaywallOpen]);

  // Keyboard shortcut to advance when solved (Space or Enter)
  useEffect(() => {
    if (status !== "solved") return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.code === "Enter") {
        e.preventDefault();
        if (canPlay === false && !isPro) {
          setIsReviewing(true);
          setIsExiting(false);
          setDragY(0);
        }
        onNextPuzzle();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [status, onNextPuzzle, canPlay, isPro]);

  // Stable ref for triggerSwipeNext to use in executeUserMove
  const triggerSwipeNextRef = useRef<() => void>(() => {});

  // Unified move executor for both Drag-and-Drop and Click-to-Move
  const executeUserMove = useCallback(
    (sourceSquare: string, targetSquare: string | null): boolean => {
      if (
        (status !== "playing" && status !== "failed") ||
        !targetSquare ||
        !gameRef.current ||
        (isCalibration && placementFeedback !== null) ||
        (canPlay === false && !isPro) ||
        isPaywallOpen
      ) {
        return false;
      }

      if (viewMoveIndex < moveHistory.length - 1) {
        setViewMoveIndex(moveHistory.length - 1);
        return false;
      }

      const game = gameRef.current;
      const expectedMove = allMoves[currentMoveIndex];

      if (!expectedMove) {
        return false;
      }

      const expectedFrom = expectedMove.slice(0, 2).toLowerCase();
      const expectedTo = expectedMove.slice(2, 4).toLowerCase();
      const expectedPromo =
        expectedMove.length === 5 ? expectedMove[4].toLowerCase() : undefined;

      // 1. Check chess legality with chess.js
      let moveMade = null;
      try {
        moveMade = game.move({
          from: sourceSquare,
          to: targetSquare,
          promotion: expectedPromo ?? "q",
        });
      } catch {
        return false;
      }

      if (!moveMade) {
        return false;
      }

      const moveUci = (
        sourceSquare +
        targetSquare +
        (moveMade.promotion ? moveMade.promotion.toLowerCase() : "")
      ).toLowerCase();
      const expectedUciNormalized = (
        expectedFrom +
        expectedTo +
        (expectedPromo ?? "")
      ).toLowerCase();

      // 2. Strict UCI string comparison against next move in solution array
      if (moveUci !== expectedUciNormalized) {
        // Legal chess move, but INCORRECT puzzle solution
        game.undo();
        sounds.playError();
        haptics.error();

        if (isCalibration) {
          // Placement / Calibration game: finish on wrong move with clear crimson feedback & board highlight
          setFen(game.fen());
          setHighlightStyles({
            [sourceSquare]: {
              backgroundColor: "rgba(239, 68, 68, 0.45)",
              boxShadow: "inset 0 0 10px rgba(239, 68, 68, 0.8)",
            },
            [targetSquare]: {
              backgroundColor: "rgba(239, 68, 68, 0.55)",
              boxShadow: "inset 0 0 14px rgba(239, 68, 68, 0.95)",
            },
          });
          setPlacementFeedback("incorrect");
          onStatusChange("failed");
          if (!hasPenalizedRef.current) {
            hasPenalizedRef.current = true;
            sendEloResult("loss");
          }
          if (placementTransitionTimerRef.current) {
            clearTimeout(placementTransitionTimerRef.current);
          }
          placementTransitionTimerRef.current = setTimeout(() => {
            triggerSwipeNextRef.current();
          }, 1200);
          return false;
        }

        // Penalize Elo once per puzzle and record in PuzzleHistory
        if (!hasPenalizedRef.current) {
          hasPenalizedRef.current = true;
          sendEloResult("loss");
        }

        // QOL: Increment retries count for this puzzle
        setRetryCount((prev) => prev + 1);

        // Flash red saying incorrect & shake board
        setIsFlashingRed(true);
        setIsShaking(true);
        setMistakeFeedback("Incorrect");

        if (mistakeTimerRef.current) clearTimeout(mistakeTimerRef.current);
        mistakeTimerRef.current = setTimeout(() => {
          setIsShaking(false);
          setIsFlashingRed(false);
          setMistakeFeedback(null);
        }, 850);

        // Clear square selection & highlights
        setSelectedSquare(null);
        setHighlightStyles({});

        // Auto-retry: piece snaps back to previous state and board remains interactive!
        setFen(game.fen());
        onStatusChange("failed");

        return false;
      }

      // 3. CORRECT MOVE!
      const playerFen = game.fen();
      setFen(playerFen);
      setMoveHistory((prev) => {
        const next = [...prev, playerFen];
        setViewMoveIndex(next.length - 1);
        return next;
      });
      sounds.playMove();
      haptics.success();
      setMistakeFeedback(null);
      setIsFlashingRed(false);
      setIsShaking(false);
      setSelectedSquare(null);
      setHighlightStyles({});
      setHintActive(false);

      const nextIndex = currentMoveIndex + 1;

      // Check if the puzzle sequence is complete
      if (nextIndex >= allMoves.length) {
        sounds.playSuccess();
        haptics.success();
        onStatusChange("solved");
        if (!hasWonRef.current) {
          hasWonRef.current = true;
          sendEloResult("win");
        }

        if (isCalibration) {
          setHighlightStyles({
            [sourceSquare]: {
              backgroundColor: "rgba(16, 185, 129, 0.45)",
              boxShadow: "inset 0 0 10px rgba(16, 185, 129, 0.8)",
            },
            [targetSquare]: {
              backgroundColor: "rgba(16, 185, 129, 0.55)",
              boxShadow: "inset 0 0 14px rgba(16, 185, 129, 0.95)",
            },
          });
          setPlacementFeedback("correct");
          if (placementTransitionTimerRef.current) {
            clearTimeout(placementTransitionTimerRef.current);
          }
          placementTransitionTimerRef.current = setTimeout(() => {
            triggerSwipeNextRef.current();
          }, 1200);
        }

        return true;
      }

      // 4. Opponent counter-reply after 300ms
      setCurrentMoveIndex(nextIndex);
      setTimeout(() => {
        const oppReply = allMoves[nextIndex];
        if (!oppReply || !gameRef.current) return;

        try {
          gameRef.current.move({
            from: oppReply.slice(0, 2),
            to: oppReply.slice(2, 4),
            promotion: oppReply.length === 5 ? oppReply[4].toLowerCase() : undefined,
          });
          const oppFen = gameRef.current.fen();
          setFen(oppFen);
          setMoveHistory((prev) => {
            const next = [...prev, oppFen];
            setViewMoveIndex(next.length - 1);
            return next;
          });
          sounds.playMove();

          const afterOppIndex = nextIndex + 1;
          setCurrentMoveIndex(afterOppIndex);

          if (afterOppIndex >= allMoves.length) {
            sounds.playSuccess();
            haptics.success();
            onStatusChange("solved");
            if (!hasWonRef.current) {
              hasWonRef.current = true;
              sendEloResult("win");
            }

            if (isCalibration) {
              const oppFrom = oppReply.slice(0, 2);
              const oppTo = oppReply.slice(2, 4);
              setHighlightStyles({
                [oppFrom]: {
                  backgroundColor: "rgba(16, 185, 129, 0.45)",
                  boxShadow: "inset 0 0 10px rgba(16, 185, 129, 0.8)",
                },
                [oppTo]: {
                  backgroundColor: "rgba(16, 185, 129, 0.55)",
                  boxShadow: "inset 0 0 14px rgba(16, 185, 129, 0.95)",
                },
              });
              setPlacementFeedback("correct");
              if (placementTransitionTimerRef.current) {
                clearTimeout(placementTransitionTimerRef.current);
              }
              placementTransitionTimerRef.current = setTimeout(() => {
                triggerSwipeNextRef.current();
              }, 1200);
            }
          }
        } catch (err) {
          console.error("Opponent reply error:", err);
        }
      }, 300);

      return true;
    },
    [status, allMoves, currentMoveIndex, onStatusChange, sendEloResult, isCalibration, placementFeedback, canPlay, isPro, isPaywallOpen, viewMoveIndex, moveHistory.length]
  );

  // Drag and drop drop handler - strictly locked when status !== 'playing' && status !== 'failed' or paywalled
  const handlePieceDrop = ({
    sourceSquare,
    targetSquare,
  }: {
    sourceSquare: string;
    targetSquare: string | null;
  }): boolean => {
    isPieceDragRef.current = false;
    if (status !== "playing" && status !== "failed") return false;
    if ((canPlay === false && !isPro) || isPaywallOpen) return false;
    if (viewMoveIndex < moveHistory.length - 1) {
      setViewMoveIndex(moveHistory.length - 1);
      return false;
    }
    return executeUserMove(sourceSquare, targetSquare);
  };

  // Click-to-move / Tap-to-move handler
  const handleSquareClick = ({ square }: { square: string }) => {
    if (viewMoveIndex < moveHistory.length - 1) {
      setViewMoveIndex(moveHistory.length - 1);
      return;
    }
    if ((status !== "playing" && status !== "failed") || !gameRef.current) return;
    if ((canPlay === false && !isPro) || isPaywallOpen) return;
    const game = gameRef.current;
    const myColor = boardOrientation === "white" ? "w" : "b";

    // 1. If no square selected yet:
    if (!selectedSquare) {
      const piece = game.get(square as Square);
      if (piece && piece.color === myColor) {
        setSelectedSquare(square);
        const legalMoves = game.moves({
          square: square as Square,
          verbose: true,
        });

        // Compute styling for reachable squares (refined gold selection & clean rings)
        const styles: Record<string, React.CSSProperties> = {
          [square]: {
            backgroundColor: "rgba(194, 155, 120, 0.35)",
            boxShadow: "inset 0 0 0 2.5px #c29b78",
            borderRadius: "4px",
          },
        };

        for (const m of legalMoves) {
          const pieceOnTarget = game.get(m.to as Square);
          if (pieceOnTarget) {
            styles[m.to] = {
              background:
                "radial-gradient(circle, transparent 52%, rgba(239, 68, 68, 0.75) 54%, rgba(239, 68, 68, 0.75) 64%, transparent 66%)",
              cursor: "pointer",
            };
          } else {
            styles[m.to] = {
              background:
                "radial-gradient(circle, rgba(0, 0, 0, 0.25) 20%, transparent 22%)",
              cursor: "pointer",
            };
          }
        }

        setHighlightStyles(styles);
        haptics.tap();
      }
      return;
    }

    // 2. If clicking the already selected square: deselect
    if (selectedSquare === square) {
      setSelectedSquare(null);
      setHighlightStyles({});
      return;
    }

    // 3. If clicking another piece of the same color: change selection
    const clickedPiece = game.get(square as Square);
    if (clickedPiece && clickedPiece.color === myColor) {
      setSelectedSquare(square);
      const legalMoves = game.moves({
        square: square as Square,
        verbose: true,
      });

      const styles: Record<string, React.CSSProperties> = {
        [square]: {
          backgroundColor: "rgba(194, 155, 120, 0.35)",
          boxShadow: "inset 0 0 0 2.5px #c29b78",
          borderRadius: "4px",
        },
      };

      for (const m of legalMoves) {
        const pieceOnTarget = game.get(m.to as Square);
        if (pieceOnTarget) {
          styles[m.to] = {
            background:
              "radial-gradient(circle, transparent 52%, rgba(239, 68, 68, 0.75) 54%, rgba(239, 68, 68, 0.75) 64%, transparent 66%)",
            cursor: "pointer",
          };
        } else {
          styles[m.to] = {
            background:
              "radial-gradient(circle, rgba(0, 0, 0, 0.25) 20%, transparent 22%)",
            cursor: "pointer",
          };
        }
      }

      setHighlightStyles(styles);
      haptics.tap();
      return;
    }

    // 4. If clicking a reachable target square: make the move!
    if (highlightStyles[square]) {
      const from = selectedSquare;
      setSelectedSquare(null);
      setHighlightStyles({});
      executeUserMove(from, square);
    } else {
      // Clicked an invalid/unreachable square: deselect
      setSelectedSquare(null);
      setHighlightStyles({});
    }
  };

  // Right Rail Action: Bookmark Toggle
  const handleToggleBookmark = () => {
    if (!puzzle) return;
    haptics.tap();
    try {
      const userKey = guestId ? `chess_reel_bookmarks_${guestId}` : "chess_reel_bookmarks";
      const saved = localStorage.getItem(userKey) || localStorage.getItem("chess_reel_bookmarks");
      let ids: string[] = saved ? JSON.parse(saved) : [];

      const puzzlesKey = guestId ? `chess_reel_saved_puzzles_${guestId}` : "chess_reel_saved_puzzles";
      const savedPuzzlesRaw = localStorage.getItem(puzzlesKey) || localStorage.getItem("chess_reel_saved_puzzles");
      let savedPuzzlesMap: Record<string, PuzzleData> = {};
      try {
        if (savedPuzzlesRaw) savedPuzzlesMap = JSON.parse(savedPuzzlesRaw);
      } catch {}

      if (ids.includes(puzzle.id)) {
        ids = ids.filter((id) => id !== puzzle.id);
        delete savedPuzzlesMap[puzzle.id];
        setIsBookmarked(false);
        showToast("Bookmark removed");
      } else {
        ids.push(puzzle.id);
        ids = Array.from(new Set(ids));
        savedPuzzlesMap[puzzle.id] = puzzle;
        setIsBookmarked(true);
        showToast("Puzzle saved to bookmarks!");
      }
      localStorage.setItem(userKey, JSON.stringify(ids));
      localStorage.setItem("chess_reel_bookmarks", JSON.stringify(ids));
      localStorage.setItem(puzzlesKey, JSON.stringify(savedPuzzlesMap));
      localStorage.setItem("chess_reel_saved_puzzles", JSON.stringify(savedPuzzlesMap));
      window.dispatchEvent(new Event("bookmarks-updated"));
    } catch {}
  };

  // Right Rail Action: SFX Mute Toggle
  const handleToggleSFX = () => {
    haptics.tap();
    const muted = sounds.toggleMute();
    setIsMuted(muted);
    showToast(muted ? "Sound Effects Muted" : "Sound Effects On");
  };

  // Community Action: Like Puzzle
  const handleToggleLike = async () => {
    if (!puzzle?.id) return;
    haptics.tap();

    const nextLiked = !isLiked;
    setIsLiked(nextLiked);
    setLikesCount((prev) => (nextLiked ? prev + 1 : Math.max(0, prev - 1)));

    if (nextLiked) {
      showToast("Added to Liked Puzzles ❤️");
    }

    try {
      if (typeof window !== "undefined") {
        const saved = localStorage.getItem("chess_reel_likes");
        let ids: string[] = saved ? JSON.parse(saved) : [];
        if (nextLiked) {
          if (!ids.includes(puzzle.id)) ids.push(puzzle.id);
        } else {
          ids = ids.filter((id) => id !== puzzle.id);
        }
        localStorage.setItem("chess_reel_likes", JSON.stringify(ids));
      }

      await fetch("/api/puzzle/like", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          puzzleId: puzzle.id,
          userId: guestId,
          action: nextLiked ? "like" : "unlike",
        }),
      });
    } catch {}
  };

  // Right Rail Action: Share
  const handleShare = async () => {
    haptics.tap();
    const shareText = `Can you solve this ${puzzle?.rating ?? 1200} Elo puzzle on Chess Reel? ❤️ ${likesCount} players liked it!`;
    const shareUrl = typeof window !== "undefined" ? window.location.href : "";

    if (navigator.share) {
      try {
        await navigator.share({
          title: "Chess Reel Challenge",
          text: shareText,
          url: shareUrl,
        });
        return;
      } catch {}
    }

    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(`${shareText}\n${shareUrl}`);
      }
      showToast("Link copied to clipboard!");
    } catch {
      showToast("Link copied to clipboard!");
    }
  };

  // Right Rail Action: Flip Board Orientation
  const handleFlipBoard = () => {
    haptics.tap();
    setBoardOrientation((prev) => (prev === "white" ? "black" : "white"));
  };

  // Bottom Action: Trigger Tactical Hint
  const handleTriggerHint = () => {
    if (status !== "playing" && status !== "failed") return;
    haptics.tap();
    const expectedMove = allMoves[currentMoveIndex];
    if (!expectedMove) return;

    const fromSquare = expectedMove.slice(0, 2);
    const toSquare = expectedMove.slice(2, 4);

    setHintActive(true);
    setHintUsed(true);

    // Highlight the hint squares with glowing gold aura
    setHighlightStyles({
      [fromSquare]: {
        backgroundColor: "rgba(194, 155, 120, 0.45)",
        boxShadow: "inset 0 0 0 3px #c29b78, 0 0 16px rgba(194, 155, 120, 0.7)",
      },
      [toSquare]: {
        background:
          "radial-gradient(circle, rgba(194, 155, 120, 0.75) 28%, transparent 30%)",
        boxShadow: "inset 0 0 0 2px rgba(194, 155, 120, 0.6)",
      },
    });

    const piece = gameRef.current ? gameRef.current.get(fromSquare as any) : null;
    const pieceNames: Record<string, string> = {
      p: "Pawn",
      n: "Knight",
      b: "Bishop",
      r: "Rook",
      q: "Queen",
      k: "King",
    };
    const pieceLabel = piece ? ` (${pieceNames[piece.type] || piece.type.toUpperCase()})` : "";
    showToast(`Hint: Focus on ${fromSquare.toUpperCase()}${pieceLabel}!`);
  };

  // Calculate puzzle completion steps
  const totalPlayerMoves = Math.max(
    1,
    Math.ceil((allMoves.length - (allMoves.length % 2 === 0 ? 1 : 0)) / 2)
  );
  const currentStep = Math.min(
    totalPlayerMoves,
    Math.floor((currentMoveIndex - (allMoves.length % 2 === 0 ? 1 : 0)) / 2) + 1
  );

  const themeList = puzzle?.themes
    ? puzzle.themes
        .split(" ")
        .slice(0, 2)
        .map((t) => t.replace(/([A-Z])/g, " $1").trim())
    : ["Tactics", "Middlegame"];

  // --- REELS VERTICAL SWIPE ENGINE ---
  const [dragY, setDragY] = useState<number>(0);
  const [isSwiping, setIsSwiping] = useState<boolean>(false);
  const [isExiting, setIsExiting] = useState<boolean>(false);
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const isPieceDragRef = useRef<boolean>(false);
  const isMouseDownRef = useRef<boolean>(false);
  const lastWheelTimeRef = useRef<number>(0);

  // Trigger next puzzle advance with smooth reel upward launch
  const triggerSwipeNext = useCallback(() => {
    dismissIdleIndicator();
    if (placementTransitionTimerRef.current) {
      clearTimeout(placementTransitionTimerRef.current);
      placementTransitionTimerRef.current = null;
    }
    if ((canPlay === false && !isPro) || isPaywallOpen) {
      setIsExiting(false);
      setDragY(0);
      setIsSwiping(false);
      setIsReviewing(true);
      onNextPuzzle();
      return;
    }
    if (isExiting) return;
    setIsExiting(true);
    setDragY(-360);
    haptics.tap();
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    }
    setTimeout(() => {
      onNextPuzzle();
      if (typeof window !== "undefined") {
        window.scrollTo({ top: 0, left: 0, behavior: "instant" });
      }
    }, 180);
  }, [isExiting, onNextPuzzle, canPlay, isPro, isPaywallOpen, dismissIdleIndicator]);

  useEffect(() => {
    triggerSwipeNextRef.current = triggerSwipeNext;
  }, [triggerSwipeNext]);

  // Trigger previous puzzle advance with smooth reel downward slide
  const triggerSwipePrev = useCallback(() => {
    dismissIdleIndicator();
    if (placementTransitionTimerRef.current) {
      clearTimeout(placementTransitionTimerRef.current);
      placementTransitionTimerRef.current = null;
    }
    if (!canGoPrev || !onPrevPuzzle) {
      setDragY(0);
      return;
    }
    if (isExiting) return;
    setIsExiting(true);
    setDragY(360);
    haptics.tap();
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    }
    setTimeout(() => {
      onPrevPuzzle();
      if (typeof window !== "undefined") {
        window.scrollTo({ top: 0, left: 0, behavior: "instant" });
      }
    }, 180);
  }, [canGoPrev, isExiting, onPrevPuzzle, dismissIdleIndicator]);

  // User drawn arrows state (synced with react-chessboard options.arrows)
  const [touchArrows, setTouchArrows] = useState<Array<{ startSquare: string; endSquare: string; color: string }>>([]);
  const touchArrowStartRef = useRef<{ square: string; x: number; y: number } | null>(null);
  const touchArrowCurrentRef = useRef<string | null>(null);

  // Clear drawn arrows on puzzle change or retry
  useEffect(() => {
    setTouchArrows([]);
  }, [fen, puzzle?.id]);

  const handleBoardTouchStart = (e: React.TouchEvent) => {
    if (!isDesktopPointer) return;
    const target = e.target as HTMLElement | null;
    const isPiece = Boolean(target?.closest("[data-piece]") || target?.closest(".piece"));
    if (e.touches.length === 2 || (!isPiece && e.touches.length === 1)) {
      const touch = e.touches[0];
      const elem = document.elementFromPoint(touch.clientX, touch.clientY);
      const square = elem?.closest("[data-square]")?.getAttribute("data-square");
      if (square) {
        touchArrowStartRef.current = { square, x: touch.clientX, y: touch.clientY };
        touchArrowCurrentRef.current = square;
      }
    }
  };

  const handleBoardTouchMove = (e: React.TouchEvent) => {
    if (!isDesktopPointer) return;
    if (!touchArrowStartRef.current) return;
    const touch = e.touches[0];
    const elem = document.elementFromPoint(touch.clientX, touch.clientY);
    const square = elem?.closest("[data-square]")?.getAttribute("data-square");
    if (square && square !== touchArrowStartRef.current.square) {
      touchArrowCurrentRef.current = square;
    }
  };

  const handleBoardTouchEnd = () => {
    if (!isDesktopPointer) return;
    if (touchArrowStartRef.current && touchArrowCurrentRef.current) {
      const start = touchArrowStartRef.current.square;
      const end = touchArrowCurrentRef.current;
      if (start && end && start !== end) {
        setTouchArrows((prev) => {
          const exists = prev.findIndex(
            (a) => a.startSquare === start && a.endSquare === end
          );
          if (exists >= 0) {
            return prev.filter((_, idx) => idx !== exists);
          }
          return [
            ...prev,
            {
              startSquare: start,
              endSquare: end,
              color: "#c29b78",
            },
          ];
        });
      }
    }
    touchArrowStartRef.current = null;
    touchArrowCurrentRef.current = null;
  };

  // Touch handlers for mobile swipe
  const handleTouchStart = (e: React.TouchEvent) => {
    if (isExiting) return;
    const touch = e.touches[0];
    const target = e.target as HTMLElement | null;

    // 1. Ignore if touch started on an interactive control (button, link, input, etc.)
    if (target?.closest("button, a, input, select, [role='button'], [data-interactive]")) {
      touchStartRef.current = null;
      return;
    }

    // 2. On desktop pointer devices, ignore touches inside chessboard container so mouse/drawing works undisturbed
    if (isDesktopPointer && target?.closest("[data-testid='chessboard-container']")) {
      touchStartRef.current = null;
      return;
    }

    // 3. Ignore if touch started on a chess piece while puzzle is actively being played
    if (
      (status === "playing" || status === "failed") &&
      (target?.closest("[data-piece]") ||
        target?.closest(".piece") ||
        isPieceDragRef.current)
    ) {
      touchStartRef.current = null;
      return;
    }

    touchStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now(),
    };
    setIsSwiping(false);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStartRef.current || isExiting) return;
    const touch = e.touches[0];
    const deltaX = touch.clientX - touchStartRef.current.x;
    const deltaY = touch.clientY - touchStartRef.current.y;

    // Only initiate vertical swipe if vertical movement clearly dominates horizontal movement
    if (Math.abs(deltaY) > Math.abs(deltaX) && Math.abs(deltaY) > 6) {
      dismissIdleIndicator();
      if (e.cancelable) {
        e.preventDefault();
      }
      setIsSwiping(true);
      if (deltaY < 0) {
        setDragY(deltaY);
      } else {
        if (canGoPrev) {
          setDragY(deltaY);
        } else {
          // If currentIndex === 0, apply subtle rubber-band resistance
          setDragY(deltaY * 0.25);
        }
      }
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current || isExiting) return;
    const touch = e.changedTouches[0];
    const deltaY = touch.clientY - touchStartRef.current.y;
    const deltaTime = Math.max(1, Date.now() - touchStartRef.current.time);
    const velocityY = deltaY / deltaTime;

    touchStartRef.current = null;
    setIsSwiping(false);

    // Swipe Up (Next Puzzle): deltaY < -50 px OR upward flick velocity
    if (deltaY < -50 || (deltaY < -20 && velocityY < -0.3)) {
      triggerSwipeNext();
      return;
    }

    // Swipe Down (Previous Puzzle): deltaY > 50 px OR downward flick velocity
    if (deltaY > 50 || (deltaY > 20 && velocityY > 0.35)) {
      if (canGoPrev) {
        triggerSwipePrev();
        return;
      } else {
        // Rubber-band snap back to 0
        setDragY(0);
        return;
      }
    }

    // Released without crossing threshold: snap crisply back to center (0)
    setDragY(0);
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    }
  };

  const handleTouchCancel = () => {
    touchStartRef.current = null;
    setIsSwiping(false);
    setDragY(0);
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    }
  };

  // Mouse Drag (for desktop & simulator preview)
  const handleMouseDown = (e: React.MouseEvent) => {
    if (isExiting) return;
    // Strictly require primary left-click for reel swipe (ignore right-click arrow drawing and middle clicks)
    if (e.button !== 0) return;

    const target = e.target as HTMLElement | null;
    if (target?.closest("button, a, input, select, [role='button'], [data-interactive]")) return;
    // On desktop pointer devices, chessboard NEVER triggers reel swipe
    if (isDesktopPointer && target?.closest("[data-testid='chessboard-container']")) return;
    if ((status === "playing" || status === "failed") && (target?.closest("[data-piece]") || target?.closest(".piece"))) return;

    isMouseDownRef.current = true;
    touchStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      time: Date.now(),
    };
  };

  useEffect(() => {
    const handleWindowMouseMove = (e: MouseEvent) => {
      if (!isMouseDownRef.current || !touchStartRef.current || isExiting) return;
      const deltaY = e.clientY - touchStartRef.current.y;
      const deltaX = e.clientX - touchStartRef.current.x;

      if (Math.abs(deltaY) > Math.abs(deltaX) && Math.abs(deltaY) > 6) {
        dismissIdleIndicator();
        setIsSwiping(true);
        if (deltaY < 0) {
          setDragY(deltaY);
        } else {
          if (canGoPrev) {
            setDragY(deltaY);
          } else {
            setDragY(deltaY * 0.25);
          }
        }
      }
    };

    const handleWindowMouseUp = (e: MouseEvent) => {
      if (!isMouseDownRef.current || !touchStartRef.current || isExiting) {
        isMouseDownRef.current = false;
        return;
      }
      isMouseDownRef.current = false;
      const deltaY = e.clientY - touchStartRef.current.y;
      const deltaTime = Math.max(1, Date.now() - touchStartRef.current.time);
      const velocityY = deltaY / deltaTime;

      touchStartRef.current = null;
      setIsSwiping(false);

      if (deltaY < -50 || (deltaY < -20 && velocityY < -0.3)) {
        triggerSwipeNext();
        return;
      }
      if (deltaY > 50 || (deltaY > 20 && velocityY > 0.35)) {
        if (canGoPrev) {
          triggerSwipePrev();
          return;
        } else {
          setDragY(0);
          return;
        }
      }
      setDragY(0);
    };

    window.addEventListener("mousemove", handleWindowMouseMove);
    window.addEventListener("mouseup", handleWindowMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleWindowMouseMove);
      window.removeEventListener("mouseup", handleWindowMouseUp);
    };
  }, [isExiting, canGoPrev, triggerSwipeNext, triggerSwipePrev, dismissIdleIndicator]);

  // Wheel / Trackpad Scroll to advance / prev
  const handleWheel = (e: React.WheelEvent) => {
    if (isExiting) return;
    const target = e.target as HTMLElement | null;
    if (isDesktopPointer && target?.closest("[data-testid='chessboard-container']")) return;
    const now = Date.now();
    if (now - lastWheelTimeRef.current < 500) return;

    if (e.deltaY > 45) {
      dismissIdleIndicator();
      lastWheelTimeRef.current = now;
      triggerSwipeNext();
    } else if (e.deltaY < -45) {
      dismissIdleIndicator();
      lastWheelTimeRef.current = now;
      if (canGoPrev) {
        triggerSwipePrev();
      } else {
        setDragY(0);
      }
    }
  };

  // Keyboard navigation shortcuts:
  // ArrowLeft / ArrowRight = Step Back / Step Forward through move history
  // ArrowDown / PageDown = Next Reel, ArrowUp / PageUp = Prev Reel
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      if (activeEl?.tagName === "INPUT" || activeEl?.tagName === "TEXTAREA") return;

      if (e.key === "ArrowLeft") {
        e.preventDefault();
        handleStepBack();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        handleStepForward();
      } else if (e.key === "ArrowDown" || e.key === "PageDown") {
        e.preventDefault();
        triggerSwipeNext();
      } else if (e.key === "ArrowUp" || e.key === "PageUp") {
        e.preventDefault();
        const cannotGoPrev = !canGoPrev || (currentIndex !== undefined && currentIndex === 0);
        if (!cannotGoPrev) {
          triggerSwipePrev();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleStepBack, handleStepForward, canGoPrev, currentIndex, triggerSwipeNext, triggerSwipePrev]);

  const puzzleTagline = getPuzzleTagline(puzzle, boardOrientation);

  return (
    <motion.div
      initial={{
        y: slideDirection === "prev" ? "-100%" : "100%",
        opacity: 0,
      }}
      animate={{
        y: dragY,
        opacity: isExiting ? 0 : Math.max(0.35, 1 - Math.abs(dragY) / 450),
      }}
      transition={
        isSwiping
          ? { duration: 0 }
          : { type: "spring", stiffness: 450, damping: 32 }
      }
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchCancel}
      onMouseDown={handleMouseDown}
      onWheel={handleWheel}
      className="w-full flex flex-col items-center justify-start max-w-md mx-auto relative select-none touch-none overscroll-none"
    >
      {/* Toast Notification Pill */}
      {toastMessage && (
        <div className="fixed top-18 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full bg-[#22201e]/95 border border-[#c29b78]/40 text-[#c29b78] text-xs font-bold shadow-2xl backdrop-blur-md animate-in fade-in zoom-in-95 duration-150 flex items-center gap-1.5">
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Breathing space above the chessboard utility box */}
      <div className="w-full h-2.5 sm:h-3.5" />

      {/* Top Metadata Row: Time, Tagline & Controls Flush across Chessboard Width */}
      <div
        data-testid="puzzle-board-header-bar"
        className="w-full px-0 py-2 flex items-center justify-between text-xs text-[#f5f5f5]"
      >
        {/* Time (Flush on left) */}
        <div
          data-testid="puzzle-timer-pill"
          className="flex items-center gap-1.5 text-xs font-mono font-bold tabular-nums text-[#f5f5f5] shrink-0"
          title="Current puzzle time"
        >
          <Clock className="w-3.5 h-3.5 text-[#c29b78]" />
          <span className="tabular-nums">{formatTimer(timerSeconds)}</span>
        </div>

        {/* Puzzle Tag / Tagline (Flush inside the row, dynamically scaled to available space with NO symbol) */}
        <div
          data-testid="puzzle-tagline-container"
          className="flex-1 min-w-0 mx-2 flex items-center justify-center overflow-hidden"
        >
          <span
            className="font-bold uppercase tracking-wider text-[#c29b78] font-mono text-center truncate select-none"
            style={{
              fontSize:
                puzzleTagline.length > 32
                  ? "clamp(7.5px, 2.2vw, 9.5px)"
                  : puzzleTagline.length > 24
                  ? "clamp(8.5px, 2.6vw, 10.5px)"
                  : "clamp(9.5px, 3vw, 11.5px)",
              letterSpacing: puzzleTagline.length > 28 ? "0.02em" : "0.05em",
            }}
            title={puzzleTagline}
          >
            {puzzleTagline}
          </span>
        </div>

        {/* Audio & Flip Board Buttons (Flush on right) */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Sound Toggle */}
          <button
            onClick={handleToggleSFX}
            data-testid="toggle-sound-btn"
            aria-label="Toggle piece sound"
            title={isMuted ? "Unmute audio" : "Mute audio"}
            className={`flex items-center justify-center p-1 -m-1 text-xs transition-colors cursor-pointer hover:text-white ${
              isMuted ? "text-[#78716c]" : "text-[#c29b78]"
            }`}
          >
            {isMuted ? (
              <VolumeX strokeWidth={1.75} className="w-[18px] h-[18px]" />
            ) : (
              <Volume2 strokeWidth={1.75} className="w-[18px] h-[18px]" />
            )}
          </button>

          {/* Flip Board */}
          <button
            onClick={handleFlipBoard}
            data-testid="flip-board-btn"
            aria-label="Flip board"
            title="Flip board orientation"
            className="flex items-center justify-center p-1 -m-1 text-xs text-[#78716c] hover:text-[#f5f2eb] transition-colors cursor-pointer"
          >
            <ArrowUpDown strokeWidth={1.75} className="w-[18px] h-[18px]" />
          </button>
        </div>
      </div>

      {/* 2. The Hero Chessboard Theater (Edge-to-edge horizontal, 1:1 aspect-square) */}
      <div className="relative w-full aspect-square flex items-center justify-center my-1 rounded-lg overflow-hidden">
        <div
          data-testid="chessboard-container"
          data-fen={displayFen}
          onTouchStart={handleBoardTouchStart}
          onTouchMove={handleBoardTouchMove}
          onTouchEnd={handleBoardTouchEnd}
          onContextMenu={(e) => e.preventDefault()}
          className={`relative w-full h-full aspect-square overflow-hidden rounded-lg flex flex-col justify-between transition-all duration-300 ${
            isDesktopPointer ? "touch-none" : ""
          } ${
            isShaking ? "animate-board-shake" : ""
          }`}
        >
          {displayFen ? (
            <Chessboard
              options={{
                id: "chess-reel-active-board",
                position: displayFen,
                boardOrientation: boardOrientation,
                allowDragging:
                  (status === "playing" || status === "failed") &&
                  (!isCalibration || placementFeedback === null) &&
                  (canPlay !== false || isPro) &&
                  !isPaywallOpen &&
                  viewMoveIndex === moveHistory.length - 1,
                canDragPiece: () => {
                  if (viewMoveIndex < moveHistory.length - 1) {
                    setViewMoveIndex(moveHistory.length - 1);
                    return false;
                  }
                  return (
                    (status === "playing" || status === "failed") &&
                    (!isCalibration || placementFeedback === null) &&
                    (canPlay !== false || isPro) &&
                    !isPaywallOpen
                  );
                },
                onPieceDrop: (args) => {
                  setTouchArrows([]);
                  return handlePieceDrop(args);
                },
                onPieceDrag: () => {
                  if (viewMoveIndex < moveHistory.length - 1) {
                    setViewMoveIndex(moveHistory.length - 1);
                    return;
                  }
                  isPieceDragRef.current = true;
                },
                onPieceDragCancel: () => {
                  isPieceDragRef.current = false;
                },
                onSquareClick: (args) => {
                  setTouchArrows([]);
                  handleSquareClick(args);
                },
                squareStyles: highlightStyles,
                animationDurationInMs: 250,
                showNotation: showCoordinates,
                darkSquareNotationStyle: {
                  color: boardTheme.light,
                  fontWeight: 700,
                },
                lightSquareNotationStyle: {
                  color: boardTheme.dark,
                  fontWeight: 700,
                },
                alphaNotationStyle: {
                  fontSize: "11px",
                  fontWeight: 700,
                  position: "absolute",
                  bottom: 1,
                  right: 3,
                  userSelect: "none",
                  lineHeight: 1,
                  opacity: 0.9,
                },
                numericNotationStyle: {
                  fontSize: "11px",
                  fontWeight: 700,
                  position: "absolute",
                  top: 2,
                  left: 3,
                  userSelect: "none",
                  lineHeight: 1,
                  opacity: 0.9,
                },
                boardStyle: { borderRadius: "0px" },
                darkSquareStyle: { backgroundColor: boardTheme.dark },
                lightSquareStyle: { backgroundColor: boardTheme.light },
                dropSquareStyle: {
                  boxShadow: "inset 0 0 1px 3px rgba(194, 155, 120, 0.9)",
                },
                allowDrawingArrows: isDesktopPointer,
                clearArrowsOnClick: true,
                clearArrowsOnPositionChange: true,
                arrows: isDesktopPointer ? touchArrows : [],
                arrowOptions: {
                  ...defaultArrowOptions,
                  color: "#c29b78",
                  colors: {
                    default: "#c29b78",
                    shift: "#3b82f6",
                    ctrl: "#10b981",
                    alt: "#ef4444",
                    meta: "#8b5cf6",
                  },
                },
              }}
            />
          ) : (
            <div className="w-full h-full bg-[#151413] flex items-center justify-center">
              <div className="w-8 h-8 border-2 border-[#c29b78] border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {/* Solved Celebration Hero Overlay */}
          <AnimatePresence>
            {status === "solved" && !isReviewing && !isCalibration && (
              <motion.div
                initial={{ scale: 0.85, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.85, opacity: 0 }}
                transition={{ type: "spring", stiffness: 350, damping: 25 }}
                className="absolute inset-0 bg-[#151413]/92 backdrop-blur-md flex flex-col items-center justify-center p-4 z-20"
              >
                <div className="relative mb-3">
                  <div className="absolute -inset-3 bg-[#c29b78]/30 rounded-full blur-xl animate-pulse" />
                  <div className="relative p-3.5 bg-gradient-to-tr from-[#c29b78] to-[#e8d3b9] text-[#151413] rounded-full shadow-2xl">
                    <Trophy className="w-9 h-9 stroke-[2.5]" />
                  </div>
                </div>

                <div className="text-xl sm:text-2xl font-black text-white tracking-tight uppercase mb-1 drop-shadow-md flex items-center gap-1.5">
                  <span>Puzzle Solved!</span>
                  <Sparkles className="w-5 h-5 text-[#c29b78] fill-[#c29b78]" />
                </div>

                <div className="flex items-center gap-2 mb-4">
                  {lastEloChange !== null && (
                    <span className="px-2.5 py-1 rounded-full bg-[#10b981]/20 border border-[#10b981]/40 text-[#10b981] text-xs font-black tracking-wide">
                      {lastEloChange >= 0 ? `+${lastEloChange}` : lastEloChange} Elo
                    </span>
                  )}
                  {streak > 0 && (
                    <span className="px-2.5 py-1 rounded-full bg-[#c29b78]/20 border border-[#c29b78]/40 text-[#c29b78] text-xs font-black flex items-center gap-1">
                      <Flame className="w-3.5 h-3.5 fill-[#c29b78]" />
                      <span>{streak} Streak!</span>
                    </span>
                  )}
                  {combo > 1 && (
                    <span
                      data-testid="celebration-combo-badge"
                      className="px-2.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-xs font-black flex items-center gap-1 animate-in zoom-in-95 duration-200"
                    >
                      <Sparkles className="w-3.5 h-3.5 fill-emerald-400" />
                      <span>{combo}x Combo!</span>
                    </span>
                  )}
                </div>

                {/* Action buttons inside celebration */}
                <div className="w-full max-w-[240px] flex flex-col gap-2 pointer-events-auto">
                  <button
                    onClick={() => {
                      haptics.tap();
                      if ((canPlay === false && !isPro) || isPaywallOpen) {
                        setIsReviewing(true);
                        setIsExiting(false);
                        setDragY(0);
                      }
                      onNextPuzzle();
                    }}
                    className="w-full h-11 bg-[#c29b78] hover:bg-[#d4b08f] text-[#151413] font-black rounded-xl shadow-lg shadow-[#c29b78]/30 flex items-center justify-center gap-2 transition-transform active:scale-95 cursor-pointer"
                  >
                    <span>Next Reel</span>
                    {autoNextCountdown !== null && (
                      <span className="text-xs bg-[#151413]/20 px-2 py-0.5 rounded-full font-mono">
                        {autoNextCountdown}s
                      </span>
                    )}
                    <ArrowRight className="w-4 h-4 stroke-[3]" />
                  </button>

                  <button
                    onClick={() => {
                      haptics.tap();
                      setIsReviewing(true);
                      if (autoNextTimerRef.current) {
                        clearTimeout(autoNextTimerRef.current);
                        autoNextTimerRef.current = null;
                      }
                      setAutoNextCountdown(null);
                    }}
                    className="w-full h-9 text-xs text-[#a3a3a3] hover:text-[#f5f5f5] hover:bg-white/10 flex items-center justify-center gap-1.5 rounded-lg cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Review Board</span>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Solved Mini Badge if reviewing */}
          <AnimatePresence>
            {status === "solved" && isReviewing && (
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                transition={{ type: "spring", stiffness: 350, damping: 25 }}
                className="absolute top-3 right-3 z-10 flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#10b981]/30 border border-[#10b981]/50 backdrop-blur-md text-[#10b981] text-xs font-bold shadow-lg"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Solved</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Red Flash Overlay across Board on Mistake */}
          <AnimatePresence>
            {isFlashingRed && (
              <motion.div
                key="incorrect-flash-overlay"
                data-testid="incorrect-flash-overlay"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="absolute inset-0 z-30 pointer-events-none bg-rose-600/25 border-2 border-rose-500 shadow-[inset_0_0_35px_rgba(244,63,94,0.45)]"
              />
            )}
          </AnimatePresence>

          {/* Floating 'Incorrect' Pill Badge */}
          <AnimatePresence>
            {!isCalibration && isFlashingRed && (
              <motion.div
                key="incorrect-badge"
                data-testid="incorrect-flash-badge"
                initial={{ scale: 0.85, opacity: 0, y: -6 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.85, opacity: 0, y: -6 }}
                transition={{ type: "spring", stiffness: 450, damping: 25 }}
                className="absolute top-3 inset-x-0 mx-auto w-fit z-40 flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-rose-600/90 border border-rose-400 backdrop-blur-md text-white text-xs font-black shadow-xl shadow-rose-950/70 pointer-events-none tracking-wide"
              >
                <AlertCircle className="w-3.5 h-3.5 text-white stroke-[2.5]" />
                <span>Incorrect</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Placement Feedback Status Banner */}
          <AnimatePresence>
            {isCalibration && placementFeedback !== null && (
              <motion.div
                key={`placement-feedback-${placementFeedback}`}
                data-testid="placement-feedback-banner"
                initial={{ scale: 0.85, opacity: 0, y: -8 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.85, opacity: 0, y: -8 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                className={`absolute top-3 inset-x-0 mx-auto w-fit z-40 flex items-center gap-2 px-4 py-2 rounded-full border backdrop-blur-md text-sm font-black shadow-2xl tracking-wide select-none pointer-events-none ${
                  placementFeedback === "correct"
                    ? "bg-[#12100e]/95 border-[#10b981] text-[#10b981] shadow-emerald-950/70"
                    : "bg-[#12100e]/95 border-[#ef4444] text-[#ef4444] shadow-rose-950/70"
                }`}
              >
                {placementFeedback === "correct" ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-[#10b981] stroke-[2.5]" />
                    <span>Correct!</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-4 h-4 text-[#ef4444] stroke-[2.5]" />
                    <span>Incorrect</span>
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* 7-second post-solve idle swipe indicator */}
          <AnimatePresence>
            {showIdleSwipeIndicator && (
              <motion.div
                data-testid="idle-swipe-indicator"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                transition={{ duration: 0.25 }}
                className="absolute bottom-3 left-1/2 -translate-x-1/2 z-40 flex items-center gap-1.5 text-xs font-medium tracking-wide text-[#f5f2eb]/80 drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)] pointer-events-none select-none"
              >
                <motion.div
                  animate={{ y: [0, -5, 0] }}
                  transition={{ repeat: Infinity, duration: 1.8, ease: "easeInOut" }}
                  className="flex items-center justify-center"
                >
                  <ChevronUp className="w-3.5 h-3.5 text-[#c29b78]" />
                </motion.div>
                <span>Swipe up for next puzzle</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* 3. Flush Action Row & Compact Mission Subtitle */}
      <div className="w-full px-0 mt-3 space-y-2">
        {/* Flush Action Bar (Like, Bookmark, Share | Reset, Hint, Prev, Next) */}
        <div className="w-full flex items-center justify-between">
          {/* Left: Engagement (Like, Bookmark, Share) */}
          <div className="flex items-center gap-5">
            {/* Animated Like Button */}
            <button
              onClick={handleToggleLike}
              data-testid="like-btn"
              aria-label="Like puzzle"
              title={isLiked ? "Unlike puzzle" : "Like puzzle"}
              className="flex items-center gap-1.5 p-2 -m-2 text-[#78716c] hover:text-[#f5f2eb] cursor-pointer transition-all active:scale-90"
            >
              <motion.div
                animate={isLiked ? { scale: [1, 1.4, 1] } : { scale: 1 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
              >
                <Heart
                  strokeWidth={1.75}
                  className={`w-[22px] h-[22px] transition-colors ${
                    isLiked ? "fill-rose-500 text-rose-500 drop-shadow-[0_0_8px_rgba(244,63,94,0.5)]" : ""
                  }`}
                />
              </motion.div>
              <span data-testid="like-count" className="text-[15px] font-medium tabular-nums text-[#f5f2eb]">
                {formatLikes(likesCount)}
              </span>
            </button>

            {/* Save / Bookmark Button */}
            <button
              onClick={handleToggleBookmark}
              data-testid="bookmark-btn"
              aria-label="Save puzzle pattern"
              title={isBookmarked ? "Remove bookmark" : "Save puzzle"}
              className="p-2 -m-2 text-[#78716c] hover:text-[#f5f2eb] cursor-pointer transition-all active:scale-90"
            >
              <Bookmark
                strokeWidth={1.75}
                className={`w-[22px] h-[22px] transition-colors ${
                  isBookmarked ? "fill-[#c29b78] text-[#c29b78]" : ""
                }`}
              />
            </button>

            {/* Share Button */}
            <button
              onClick={handleShare}
              data-testid="share-puzzle-btn"
              aria-label="Share puzzle card"
              title="Share puzzle"
              className="p-2 -m-2 text-[#78716c] hover:text-[#f5f2eb] cursor-pointer transition-all active:scale-90"
            >
              <Share2 strokeWidth={1.75} className="w-[22px] h-[22px]" />
            </button>
          </div>

          {/* Right: Tactical Solver Controls & Navigation (Reset, Glowing Hint, Prev, Next) */}
          <div className="flex items-center gap-5">
            {/* Reset Button */}
            <button
              onClick={() => handleRetry(true)}
              data-testid="reset-puzzle-btn"
              aria-label="Reset puzzle"
              title="Reset puzzle"
              className="p-2 -m-2 text-[#78716c] hover:text-[#f5f2eb] cursor-pointer active:scale-90 transition-all"
            >
              <RotateCcw strokeWidth={1.75} className="w-[22px] h-[22px]" />
            </button>

            {/* Hint Button */}
            <button
              onClick={handleTriggerHint}
              disabled={status !== "playing" && status !== "failed"}
              aria-label="Hint"
              data-testid="hint-btn"
              title={isHintGlowing ? "Need help? Click for a hint!" : "Highlight tactical move"}
              className={`p-2 -m-2 cursor-pointer active:scale-90 transition-all relative ${
                isHintGlowing
                  ? "text-[#c29b78] drop-shadow-[0_0_10px_rgba(194,155,120,0.95)] animate-pulse"
                  : hintUsed
                  ? "text-stone-600"
                  : "text-[#78716c] hover:text-[#f5f2eb]"
              }`}
            >
              {isHintGlowing && (
                <span className="absolute -inset-1 rounded-full bg-[#c29b78]/30 animate-ping pointer-events-none" />
              )}
              <Lightbulb
                strokeWidth={1.75}
                className={`w-[22px] h-[22px] transition-colors ${
                  isHintGlowing
                    ? "fill-[#c29b78] text-[#c29b78]"
                    : hintUsed
                    ? "text-stone-600"
                    : "fill-[#c29b78]/20"
                }`}
              />
            </button>

            {/* Previous Move Button (<) */}
            <button
              onClick={handleStepBack}
              data-testid="prev-puzzle-btn"
              aria-label="Previous move"
              title="Previous move"
              disabled={viewMoveIndex === 0}
              className={`p-2 -m-2 transition-all cursor-pointer ${
                viewMoveIndex === 0
                  ? "opacity-25 pointer-events-none text-[#78716c]"
                  : "text-[#78716c] hover:text-[#f5f2eb] active:scale-90"
              }`}
            >
              <ChevronLeft strokeWidth={1.75} className="w-[22px] h-[22px]" />
            </button>

            {/* Next Move Button (>) */}
            <button
              onClick={handleStepForward}
              data-testid="next-puzzle-btn"
              aria-label="Next move"
              title="Next move"
              disabled={viewMoveIndex >= moveHistory.length - 1}
              className={`p-2 -m-2 transition-all cursor-pointer ${
                viewMoveIndex >= moveHistory.length - 1
                  ? "opacity-25 pointer-events-none text-[#78716c]"
                  : "text-[#78716c] hover:text-[#f5f2eb] active:scale-90"
              }`}
            >
              <ChevronRight strokeWidth={1.75} className="w-[22px] h-[22px]" />
            </button>
          </div>
        </div>

        {/* Flush Subtitle: Turn status + Step counter + Rating */}
        <div
          data-testid="puzzle-status-bar"
          className="w-full flex items-center justify-between pt-1 text-[13px] tracking-tight font-medium"
        >
          <div data-testid="puzzle-turn-indicator" className="flex items-center gap-1.5">
            <span
              className={`w-2.5 h-2.5 rounded-full ring-1 shadow-sm shrink-0 transition-transform ${
                boardOrientation === "white"
                  ? "bg-white ring-neutral-400 shadow-white/30"
                  : "bg-neutral-900 ring-neutral-600 shadow-black/80"
              }`}
            />
            <span className="font-bold text-[#f5f2eb]">{playerTurnMessage}</span>
            <span className="text-[#78716c] tabular-nums">
              • Step {currentStep} of {totalPlayerMoves}
            </span>
          </div>

          <div className="flex items-center">
            <span className="font-semibold tabular-nums text-[#c29b78]">
              {puzzle ? `${puzzle.rating} Elo` : "---"}
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

