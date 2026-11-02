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
  Clock,
  Heart,
  Lock,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import { Chessboard } from "react-chessboard";

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
  lastEloChange: number | null;
  isCalibration?: boolean;
  calibrationStep?: number;
  mode?: "ranked" | "practice";
  isPro?: boolean;
  onModeChange?: (mode: "ranked" | "practice") => void;
  onStatusChange: (status: PuzzleStatus) => void;
  onEloUpdate: (newElo: number, change: number) => void;
  onNextPuzzle: () => void;
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

export function PuzzleCard({
  puzzle,
  status,
  currentElo,
  guestId,
  streak = 0,
  lastEloChange,
  isCalibration = false,
  calibrationStep = 1,
  mode = "ranked",
  isPro = false,
  onModeChange,
  onStatusChange,
  onEloUpdate,
  onNextPuzzle,
  onOpenStats,
}: PuzzleCardProps) {
  const initialPuzzleState = computePuzzleInitialState(puzzle);
  const [fen, setFen] = useState<string>(initialPuzzleState.fen);
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
  const [autoNextCountdown, setAutoNextCountdown] = useState<number | null>(
    null
  );
  const [isReviewing, setIsReviewing] = useState<boolean>(false);

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


  const gameRef = useRef<Chess | null>(initialPuzzleState.game);
  const autoNextTimerRef = useRef<NodeJS.Timeout | null>(null);
  const mistakeTimerRef = useRef<NodeJS.Timeout | null>(null);
  const toastTimerRef = useRef<NodeJS.Timeout | null>(null);
  const hasPenalizedRef = useRef<boolean>(false);
  const hasWonRef = useRef<boolean>(false);

  // Sync bookmark, like, and mute state on puzzle load
  useEffect(() => {
    if (!puzzle) return;
    try {
      const savedBookmarks = localStorage.getItem("chess_reel_bookmarks");
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
        }),
      }).catch(() => {});

      if (isCalibration) {
        onEloUpdate(currentElo, result === "win" ? 1 : -1);
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
          }),
        });

        if (response.ok) {
          const data = await response.json();
          if (typeof data.newElo === "number") {
            onEloUpdate(data.newElo, data.eloChange ?? 0);
          }
        }
      } catch (err) {
        console.error("Failed to update Elo:", err);
      }
    },
    [puzzle, currentElo, guestId, isCalibration, onEloUpdate]
  );

  // Initialize or reset puzzle game state
  const initializePuzzle = useCallback(() => {
    if (!puzzle) return;

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
    setSelectedSquare(null);
    setHighlightStyles({});
    setHintActive(false);
    setHintUsed(false);
    hasPenalizedRef.current = false;
    hasWonRef.current = false;

    const movesArray = puzzle.moves.trim().split(/\s+/);
    setAllMoves(movesArray);

    const newGame = new Chess(puzzle.fen);
    gameRef.current = newGame;

    const initialTurn = newGame.turn(); // 'w' or 'b'
    let startIndex = 0;

    // In Lichess format, if moves count is even, moves[0] is opponent's blunder
    if (movesArray.length % 2 === 0 && movesArray.length > 0) {
      const playerColor: "white" | "black" =
        initialTurn === "w" ? "black" : "white";
      setBoardOrientation(playerColor);
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
      const playerColor: "white" | "black" =
        initialTurn === "w" ? "white" : "black";
      setBoardOrientation(playerColor);
      setPlayerTurnMessage(
        `${playerColor === "white" ? "White" : "Black"} to move`
      );
      startIndex = 0;
    }

    setSolutionStartIndex(startIndex);
    setFen(newGame.fen());
    setCurrentMoveIndex(startIndex);
    onStatusChange("playing");
  }, [puzzle, onStatusChange]);

  // Retry handler: resets board, clears all error states, allows trying again without API refetch
  // QOL: If incorrect on step x+1 (currentMoveIndex > solutionStartIndex), progress up to step x is preserved!
  const handleRetry = useCallback(
    (resetToStartArg?: boolean | unknown) => {
      if (!puzzle) return;
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
      setSelectedSquare(null);
      setHighlightStyles({});
      setHintActive(false);

      const movesArray = puzzle.moves.trim().split(/\s+/);
      setAllMoves(movesArray);

      // QOL Step Preservation:
      // If user made a mistake on step x+1 (currentMoveIndex > solutionStartIndex) and did not explicitly request full restart:
      // restore board state to step x+1, keeping the completed x moves intact!
      if (!resetToStart && currentMoveIndex > solutionStartIndex) {
        const restoredGame = new Chess(puzzle.fen);
        for (let i = 0; i < currentMoveIndex; i++) {
          const uci = movesArray[i];
          if (uci) {
            try {
              restoredGame.move({
                from: uci.slice(0, 2),
                to: uci.slice(2, 4),
                promotion: uci.length === 5 ? uci[4].toLowerCase() : undefined,
              });
            } catch (e) {
              console.error("Error replaying move to checkpoint:", e);
            }
          }
        }

        gameRef.current = restoredGame;
        setFen(restoredGame.fen());
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
      setCurrentMoveIndex(initStartIndex);
      onStatusChange("playing");
    },
    [puzzle, currentMoveIndex, solutionStartIndex, onStatusChange, showToast]
  );

  useEffect(() => {
    initializePuzzle();
  }, [initializePuzzle]);

  // Handle celebratory confetti and auto-advance timer on solve
  useEffect(() => {
    if (status !== "solved") return;

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

    // 2. If user chooses to review the board, do not auto-advance
    if (isReviewing) {
      return;
    }

    // 3. 3-second countdown giving feeling of achievement and control
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
  }, [status, isReviewing, onNextPuzzle]);

  // Keyboard shortcut to advance when solved (Space, Enter, or ArrowRight)
  useEffect(() => {
    if (status !== "solved") return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.code === "Enter" || e.code === "ArrowRight") {
        e.preventDefault();
        onNextPuzzle();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [status, onNextPuzzle]);

  // Unified move executor for both Drag-and-Drop and Click-to-Move
  const executeUserMove = useCallback(
    (sourceSquare: string, targetSquare: string | null): boolean => {
      if (status !== "playing" || !targetSquare || !gameRef.current) {
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

        // Lock board by transitioning to 'failed'
        onStatusChange("failed");

        // Penalize Elo once per puzzle and record in PuzzleHistory
        if (!hasPenalizedRef.current) {
          hasPenalizedRef.current = true;
          sendEloResult("loss");
        }

        // Visual feedback & shake
        setMistakeFeedback("Incorrect move. Click Retry to try again!");
        setIsShaking(true);

        if (mistakeTimerRef.current) clearTimeout(mistakeTimerRef.current);
        mistakeTimerRef.current = setTimeout(() => {
          setIsShaking(false);
        }, 1500);

        // Clear square selection
        setSelectedSquare(null);
        setHighlightStyles({});

        return false; // Piece snaps back and board is locked
      }

      // 3. CORRECT MOVE!
      setFen(game.fen());
      sounds.playMove();
      haptics.success();
      setMistakeFeedback(null);
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
          setFen(gameRef.current.fen());
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
          }
        } catch (err) {
          console.error("Opponent reply error:", err);
        }
      }, 300);

      return true;
    },
    [status, allMoves, currentMoveIndex, onStatusChange, sendEloResult]
  );

  // Drag and drop drop handler - strictly locked when status !== 'playing'
  const handlePieceDrop = ({
    sourceSquare,
    targetSquare,
  }: {
    sourceSquare: string;
    targetSquare: string | null;
  }): boolean => {
    isPieceDragRef.current = false;
    if (status !== "playing") return false;
    return executeUserMove(sourceSquare, targetSquare);
  };

  // Click-to-move / Tap-to-move handler
  const handleSquareClick = ({ square }: { square: string }) => {
    if (status !== "playing" || !gameRef.current) return;
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
      const saved = localStorage.getItem("chess_reel_bookmarks");
      let ids: string[] = saved ? JSON.parse(saved) : [];
      if (ids.includes(puzzle.id)) {
        ids = ids.filter((id) => id !== puzzle.id);
        setIsBookmarked(false);
        showToast("Bookmark removed");
      } else {
        ids.push(puzzle.id);
        setIsBookmarked(true);
        showToast("Puzzle saved to bookmarks!");
      }
      localStorage.setItem("chess_reel_bookmarks", JSON.stringify(ids));
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
    if (status !== "playing") return;
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
        backgroundColor: "rgba(255, 185, 95, 0.4)",
        boxShadow: "inset 0 0 0 3px rgba(255, 185, 95, 0.9)",
      },
      [toSquare]: {
        background:
          "radial-gradient(circle, rgba(255, 185, 95, 0.7) 28%, transparent 30%)",
        boxShadow: "inset 0 0 0 2px rgba(255, 185, 95, 0.6)",
      },
    });

    showToast(`Hint: Focus on ${fromSquare.toUpperCase()}!`);
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
  }, [isExiting, onNextPuzzle]);

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

    // 2. Ignore if touch started on a chess piece while puzzle is actively being played
    if (
      status === "playing" &&
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
      if (e.cancelable) {
        e.preventDefault();
      }
      setIsSwiping(true);
      // Upward drag tracks 1:1; downward pull has elastic rubber-band resistance
      if (deltaY < 0) {
        setDragY(deltaY);
      } else {
        setDragY(deltaY * 0.3);
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

    // Swipe Up: dragged up by 35px OR quick flick upwards (deltaY < -15 && velocityY < -0.3)
    if (deltaY < -35 || (deltaY < -15 && velocityY < -0.3)) {
      triggerSwipeNext();
      return;
    }

    // Pull Down: pulled down by 55px OR quick flick downwards (deltaY > 25 && velocityY > 0.35)
    if (deltaY > 55 || (deltaY > 25 && velocityY > 0.35)) {
      haptics.tap();
      setDragY(0);
      if (typeof window !== "undefined") {
        window.scrollTo({ top: 0, left: 0, behavior: "instant" });
      }
      handleRetry();
      return;
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
    const target = e.target as HTMLElement | null;
    if (target?.closest("button, a, input, select, [role='button'], [data-interactive]")) return;
    if (status === "playing" && (target?.closest("[data-piece]") || target?.closest(".piece"))) return;

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
        setIsSwiping(true);
        if (deltaY < 0) {
          setDragY(deltaY);
        } else {
          setDragY(deltaY * 0.3);
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

      if (deltaY < -35 || (deltaY < -15 && velocityY < -0.3)) {
        triggerSwipeNext();
        return;
      }
      if (deltaY > 55 || (deltaY > 25 && velocityY > 0.35)) {
        haptics.tap();
        setDragY(0);
        handleRetry();
        return;
      }
      setDragY(0);
    };

    window.addEventListener("mousemove", handleWindowMouseMove);
    window.addEventListener("mouseup", handleWindowMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleWindowMouseMove);
      window.removeEventListener("mouseup", handleWindowMouseUp);
    };
  }, [isExiting, triggerSwipeNext, handleRetry]);

  // Wheel / Trackpad Scroll to advance / retry
  const handleWheel = (e: React.WheelEvent) => {
    if (isExiting) return;
    const now = Date.now();
    if (now - lastWheelTimeRef.current < 500) return;

    if (e.deltaY > 45) {
      lastWheelTimeRef.current = now;
      triggerSwipeNext();
    } else if (e.deltaY < -45) {
      lastWheelTimeRef.current = now;
      haptics.tap();
      handleRetry();
    }
  };

  // Keyboard navigation shortcuts: ArrowDown / PageDown = Next Reel, ArrowUp / PageUp = Retry
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      if (activeEl?.tagName === "INPUT" || activeEl?.tagName === "TEXTAREA") return;

      if (e.key === "ArrowDown" || e.key === "PageDown") {
        e.preventDefault();
        triggerSwipeNext();
      } else if (e.key === "ArrowUp" || e.key === "PageUp") {
        e.preventDefault();
        handleRetry();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [triggerSwipeNext, handleRetry]);

  const puzzleTagline = getPuzzleTagline(puzzle, boardOrientation);

  return (
    <motion.div
      initial={{ y: 50, opacity: 0 }}
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

      {/* Black Rectangle Spanning Width of Chessboard: Time, Tagline & Controls Flush */}
      <div
        data-testid="puzzle-board-header-bar"
        className="w-full bg-[#181716] border-y border-white/10 px-3 sm:px-4 py-2 flex items-center justify-between text-xs text-[#f5f5f5]"
      >
        {/* Time (Flush on left) */}
        <div
          data-testid="puzzle-timer-pill"
          className="flex items-center gap-1.5 text-xs font-mono font-bold text-[#f5f5f5] shrink-0"
          title="Current puzzle time"
        >
          <Clock className="w-3.5 h-3.5 text-[#c29b78]" />
          <span>{formatTimer(timerSeconds)}</span>
        </div>

        {/* Puzzle Tag / Tagline (Flush inside the box, dynamically scaled to available space with NO symbol) */}
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
        <div className="flex items-center gap-2.5 shrink-0">
          {/* Sound Toggle */}
          <button
            onClick={handleToggleSFX}
            aria-label="Toggle piece sound"
            title={isMuted ? "Unmute audio" : "Mute audio"}
            className={`flex items-center justify-center p-0.5 text-xs transition-colors cursor-pointer hover:text-white ${
              isMuted ? "text-[#737373]" : "text-[#c29b78]"
            }`}
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>

          {/* Flip Board */}
          <button
            onClick={handleFlipBoard}
            aria-label="Flip board"
            title="Flip board orientation"
            className="flex items-center justify-center p-0.5 text-xs text-[#a3a3a3] hover:text-[#c29b78] transition-colors cursor-pointer"
          >
            <ArrowUpDown className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. The Hero Chessboard Theater (Edge-to-edge horizontal, 1:1 aspect-square) */}
      <div className="relative w-full aspect-square flex items-center justify-center my-0.5">
        <div
          data-testid="chessboard-container"
          className={`relative w-full h-full aspect-square overflow-hidden flex flex-col justify-between transition-all duration-300 touch-none ${
            isShaking ? "animate-board-shake" : ""
          }`}
        >
          {fen ? (
            <Chessboard
              options={{
                id: "chess-reel-active-board",
                position: fen,
                boardOrientation: boardOrientation,
                allowDragging: status === "playing",
                canDragPiece: () => status === "playing",
                onPieceDrop: handlePieceDrop,
                onPieceDrag: () => {
                  isPieceDragRef.current = true;
                },
                onPieceDragCancel: () => {
                  isPieceDragRef.current = false;
                },
                onSquareClick: handleSquareClick,
                squareStyles: highlightStyles,
                animationDurationInMs: 250,
                showNotation: false,
                boardStyle: { borderRadius: "0px" },
                darkSquareStyle: { backgroundColor: "#b58863" },
                lightSquareStyle: { backgroundColor: "#f0d9b5" },
                dropSquareStyle: {
                  boxShadow: "inset 0 0 1px 3px rgba(194, 155, 120, 0.9)",
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
            {status === "solved" && !isReviewing && (
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
                </div>

                {/* Action buttons inside celebration */}
                <div className="w-full max-w-[240px] flex flex-col gap-2 pointer-events-auto">
                  <button
                    onClick={() => {
                      haptics.tap();
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

          {/* Failed Board Badge */}
          <AnimatePresence>
            {status === "failed" && (
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                transition={{ type: "spring", stiffness: 350, damping: 25 }}
                className="absolute top-3 right-3 z-10 flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#ef4444]/30 border border-[#ef4444]/50 backdrop-blur-md text-[#ef4444] text-xs font-bold shadow-lg"
              >
                <AlertCircle className="w-3.5 h-3.5" />
                <span>Incorrect</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Blunder State Banner */}
      <AnimatePresence>
        {(status === "failed" || mistakeFeedback) && (
          <div className="w-full px-3 sm:px-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", stiffness: 350, damping: 25 }}
              data-testid="puzzle-failed-banner"
              className="w-full bg-[#ef4444]/15 border border-[#ef4444]/40 rounded-xl p-2.5 my-1.5 shadow-lg flex items-center justify-between gap-2"
            >
              <div className="flex items-center gap-2 min-w-0">
                <AlertCircle className="w-4 h-4 text-[#ef4444] shrink-0" />
                <div className="min-w-0">
                  <div className="text-xs font-bold text-[#ef4444]">
                    Inaccurate Move
                  </div>
                  <div className="text-[11px] text-[#f5f5f5]/80 truncate">
                    Try another line to solve the tactic!
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {currentMoveIndex > solutionStartIndex && (
                  <button
                    onClick={() => handleRetry(true)}
                    data-testid="restart-puzzle-btn"
                    title="Restart from beginning"
                    className="px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white/70 hover:text-white text-[10px] font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <span>Restart</span>
                  </button>
                )}
                <button
                  onClick={() => handleRetry(false)}
                  data-testid="retry-puzzle-btn"
                  className="px-2.5 py-1 rounded-lg bg-[#ef4444]/30 hover:bg-[#ef4444]/50 text-white text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Retry</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 3. Streamlined Mission Brief & Rating Badge */}
      <div className="w-full px-3 sm:px-4 mt-2">
        <div className="w-full bg-[#22201e]/85 backdrop-blur-md border border-white/10 rounded-xl p-2.5 shadow-lg flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              className={`w-3 h-3 rounded-full ring-2 shadow-sm shrink-0 transition-transform ${
                boardOrientation === "white"
                  ? "bg-white ring-neutral-400 shadow-white/30"
                  : "bg-neutral-950 ring-neutral-500 shadow-black/80"
              }`}
            />
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-bold text-xs text-[#f5f5f5]">{playerTurnMessage}</span>
              <span className="text-[10px] font-bold text-[#c29b78] bg-[#c29b78]/15 px-2 py-0.5 rounded-full border border-[#c29b78]/30">
                Step {currentStep} of {totalPlayerMoves}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-[#f5f5f5] bg-[#22201e] px-2 py-0.5 rounded-md border border-white/10">
              {puzzle ? `${puzzle.rating} Elo` : "---"}
            </span>
          </div>
        </div>
      </div>

      {/* 4. Action Bar: Solver Controls + Swipe Reel Pill + Reels Engagement Row */}
      <div className="w-full px-3 sm:px-4 mt-2">
        <div className="w-full flex items-center justify-between gap-1.5">
          {/* Left: Solver Actions (Reset, Hint, Skip) */}
          <div className="flex items-center gap-1.5">
            {/* Undo / Reset Button */}
            <button
              onClick={() => handleRetry(status === "failed" ? false : true)}
              data-testid={status === "failed" ? "bottom-retry-btn" : "reset-puzzle-btn"}
              aria-label="Reset puzzle"
              title={status === "failed" ? "Retry" : "Reset puzzle"}
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[#22201e] hover:bg-[#2d2a28] border border-white/10 flex items-center justify-center text-[#f5f5f5] hover:text-[#c29b78] shadow-md active:scale-90 transition-all cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            {/* Hint Button */}
            <button
              onClick={handleTriggerHint}
              disabled={status !== "playing"}
              aria-label="Hint"
              title="Highlight tactical move"
              className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full border border-white/10 flex items-center justify-center shadow-md active:scale-90 transition-all cursor-pointer ${
                hintUsed
                  ? "bg-[#22201e]/60 text-[#a3a3a3]"
                  : "bg-[#22201e] hover:bg-[#2d2a28] text-[#c29b78]"
              }`}
            >
              <Lightbulb
                className={`w-4 h-4 ${
                  hintUsed ? "text-[#a3a3a3]" : "text-[#c29b78] fill-[#c29b78]/20"
                }`}
              />
            </button>

            {/* Skip / Next Button */}
            <button
              onClick={triggerSwipeNext}
              aria-label="Next puzzle"
              title="Next puzzle / Skip"
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[#22201e] hover:bg-[#2d2a28] border border-white/10 flex items-center justify-center text-[#f5f5f5] hover:text-[#c29b78] shadow-md active:scale-90 transition-all cursor-pointer"
            >
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Center: Floating Swipe-Up Cue Pill */}
          <button
            onClick={triggerSwipeNext}
            data-testid="swipe-cue"
            title="Swipe up for next puzzle"
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-[#22201e] border border-white/10 hover:border-[#c29b78]/50 text-[#a3a3a3] hover:text-[#f5f5f5] text-[10px] uppercase font-bold tracking-wider shadow-sm select-none cursor-grab active:cursor-grabbing transition-all active:scale-95"
          >
            <ChevronUp className="w-3.5 h-3.5 text-[#c29b78] animate-bounce" />
            <span>Swipe</span>
          </button>

          {/* Right: Reels Engagement (Like Button ❤️, Bookmark 🔖, Share ↗️) */}
          <div className="flex items-center gap-1.5">
            {/* Animated Like Button */}
            <motion.button
              onClick={handleToggleLike}
              aria-label="Like puzzle"
              title={isLiked ? "Unlike puzzle" : "Like puzzle"}
              whileTap={{ scale: 0.9 }}
              className={`h-9 sm:h-10 px-2.5 sm:px-3 rounded-full border flex items-center gap-1.5 transition-all cursor-pointer shadow-md ${
                isLiked
                  ? "bg-rose-500/20 border-rose-500/50 text-rose-400 shadow-[0_0_12px_rgba(244,63,94,0.3)]"
                  : "bg-[#22201e] hover:bg-[#2d2a28] border-white/10 text-[#a3a3a3] hover:text-[#f5f5f5]"
              }`}
            >
              <motion.div
                animate={isLiked ? { scale: [1, 1.35, 1] } : { scale: 1 }}
                transition={{ duration: 0.35, ease: "easeOut" }}
              >
                <Heart
                  className={`w-3.5 h-3.5 sm:w-4 sm:h-4 transition-colors ${
                    isLiked ? "fill-rose-500 text-rose-500" : ""
                  }`}
                />
              </motion.div>
              <span className="text-xs font-bold font-mono tracking-tight text-[#f5f5f5]">
                {formatLikes(likesCount)}
              </span>
            </motion.button>

            {/* Save / Bookmark Button */}
            <button
              onClick={handleToggleBookmark}
              aria-label="Save puzzle pattern"
              title="Bookmark pattern"
              className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full border flex items-center justify-center shadow-md active:scale-90 transition-all cursor-pointer ${
                isBookmarked
                  ? "bg-[#c29b78]/20 border-[#c29b78]/50 text-[#c29b78]"
                  : "bg-[#22201e] hover:bg-[#2d2a28] border-white/10 text-[#a3a3a3] hover:text-[#f5f5f5]"
              }`}
            >
              <Bookmark className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isBookmarked ? "fill-[#c29b78]" : ""}`} />
            </button>

            {/* Share Button */}
            <button
              onClick={handleShare}
              aria-label="Share puzzle card"
              title="Share puzzle"
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[#22201e] hover:bg-[#2d2a28] border border-white/10 flex items-center justify-center text-[#f5f5f5] hover:text-[#c29b78] shadow-md active:scale-90 transition-all cursor-pointer"
            >
              <Share2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

