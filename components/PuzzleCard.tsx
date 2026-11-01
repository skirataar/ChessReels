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
} from "lucide-react";

// Dynamically import react-chessboard with ssr: false to prevent hydration errors
const Chessboard = dynamic(
  () => import("react-chessboard").then((mod) => mod.Chessboard),
  {
    ssr: false,
    loading: () => (
      <div className="w-full aspect-square bg-[#121214] rounded-xl flex items-center justify-center animate-pulse">
        <div className="text-neutral-500 font-medium">Loading board...</div>
      </div>
    ),
  }
);

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
  onStatusChange: (status: PuzzleStatus) => void;
  onEloUpdate: (newElo: number, change: number) => void;
  onNextPuzzle: () => void;
  onOpenStats?: () => void;
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
  onStatusChange,
  onEloUpdate,
  onNextPuzzle,
  onOpenStats,
}: PuzzleCardProps) {
  const [fen, setFen] = useState<string>("");
  const [boardOrientation, setBoardOrientation] = useState<"white" | "black">(
    "white"
  );
  const [currentMoveIndex, setCurrentMoveIndex] = useState<number>(0);
  const [allMoves, setAllMoves] = useState<string[]>([]);
  const [playerTurnMessage, setPlayerTurnMessage] = useState<string>("");
  const [mistakeFeedback, setMistakeFeedback] = useState<string | null>(null);
  const [isShaking, setIsShaking] = useState<boolean>(false);
  const [autoNextCountdown, setAutoNextCountdown] = useState<number | null>(
    null
  );
  const [isReviewing, setIsReviewing] = useState<boolean>(false);

  // New UI features: Bookmarking, SFX mute state, hints, toast feedback
  const [isBookmarked, setIsBookmarked] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [hintActive, setHintActive] = useState<boolean>(false);
  const [hintUsed, setHintUsed] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Click-to-move square highlights
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [highlightStyles, setHighlightStyles] = useState<
    Record<string, React.CSSProperties>
  >({});

  const gameRef = useRef<Chess | null>(null);
  const autoNextTimerRef = useRef<NodeJS.Timeout | null>(null);
  const mistakeTimerRef = useRef<NodeJS.Timeout | null>(null);
  const toastTimerRef = useRef<NodeJS.Timeout | null>(null);
  const hasPenalizedRef = useRef<boolean>(false);
  const hasWonRef = useRef<boolean>(false);

  // Sync bookmark and mute state on puzzle load asynchronously
  useEffect(() => {
    if (!puzzle) return;
    const timer = setTimeout(() => {
      try {
        const saved = localStorage.getItem("chess_reel_bookmarks");
        if (saved) {
          const ids: string[] = JSON.parse(saved);
          setIsBookmarked(ids.includes(puzzle.id));
        }
      } catch {}
      setIsMuted(sounds.getIsMuted());
    }, 0);
    return () => clearTimeout(timer);
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
    let solutionStartIndex = 0;

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
        solutionStartIndex = 1;
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
      solutionStartIndex = 0;
    }

    setFen(newGame.fen());
    setCurrentMoveIndex(solutionStartIndex);
    onStatusChange("playing");
  }, [puzzle, onStatusChange]);

  useEffect(() => {
    const timer = setTimeout(() => {
      initializePuzzle();
    }, 0);
    return () => clearTimeout(timer);
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

      const expectedFrom = expectedMove.slice(0, 2);
      const expectedTo = expectedMove.slice(2, 4);
      const expectedPromo =
        expectedMove.length === 5 ? expectedMove[4] : undefined;

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

      const moveUci =
        sourceSquare + targetSquare + (moveMade.promotion ?? "");
      const expectedUciNormalized =
        expectedFrom + expectedTo + (expectedPromo ?? "");

      // 2. Verify if dropped move matches expected puzzle move
      if (moveUci !== expectedUciNormalized) {
        // Legal chess move, but INCORRECT puzzle solution
        game.undo();
        sounds.playError();
        haptics.error();

        // Penalize Elo once per puzzle
        if (!hasPenalizedRef.current) {
          hasPenalizedRef.current = true;
          sendEloResult("loss");
        }

        // Visual feedback & shake without locking user out of solving
        setMistakeFeedback("Incorrect move. Try another!");
        setIsShaking(true);

        if (mistakeTimerRef.current) clearTimeout(mistakeTimerRef.current);
        mistakeTimerRef.current = setTimeout(() => {
          setIsShaking(false);
          setMistakeFeedback(null);
        }, 1500);

        // Clear square selection
        setSelectedSquare(null);
        setHighlightStyles({});

        return false; // Piece snaps back, but puzzle remains playable!
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
        if (!hasWonRef.current && !hasPenalizedRef.current) {
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
            promotion: oppReply.length === 5 ? oppReply[4] : undefined,
          });
          setFen(gameRef.current.fen());
          sounds.playMove();

          const afterOppIndex = nextIndex + 1;
          setCurrentMoveIndex(afterOppIndex);

          if (afterOppIndex >= allMoves.length) {
            sounds.playSuccess();
            haptics.success();
            onStatusChange("solved");
            if (!hasWonRef.current && !hasPenalizedRef.current) {
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

  // Drag and drop drop handler
  const handlePieceDrop = ({
    sourceSquare,
    targetSquare,
  }: {
    sourceSquare: string;
    targetSquare: string | null;
  }): boolean => {
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

        // Compute styling for reachable squares (subtle grey dots at 50% opacity)
        const styles: Record<string, React.CSSProperties> = {
          [square]: {
            backgroundColor: "rgba(148, 163, 184, 0.3)",
            boxShadow: "inset 0 0 0 2px rgba(226, 232, 240, 0.75)",
          },
        };

        for (const m of legalMoves) {
          const pieceOnTarget = game.get(m.to as Square);
          if (pieceOnTarget) {
            styles[m.to] = {
              background:
                "radial-gradient(circle, transparent 65%, rgba(239, 68, 68, 0.75) 67%)",
              boxShadow: "inset 0 0 0 2px rgba(239, 68, 68, 0.5)",
              cursor: "pointer",
            };
          } else {
            styles[m.to] = {
              background:
                "radial-gradient(circle, rgba(148, 163, 184, 0.5) 24%, transparent 26%)",
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
          backgroundColor: "rgba(148, 163, 184, 0.3)",
          boxShadow: "inset 0 0 0 2px rgba(226, 232, 240, 0.75)",
        },
      };

      for (const m of legalMoves) {
        const pieceOnTarget = game.get(m.to as Square);
        if (pieceOnTarget) {
          styles[m.to] = {
            background:
              "radial-gradient(circle, transparent 65%, rgba(239, 68, 68, 0.75) 67%)",
            boxShadow: "inset 0 0 0 2px rgba(239, 68, 68, 0.5)",
            cursor: "pointer",
          };
        } else {
          styles[m.to] = {
            background:
              "radial-gradient(circle, rgba(148, 163, 184, 0.5) 24%, transparent 26%)",
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

  // Right Rail Action: Share
  const handleShare = async () => {
    haptics.tap();
    const shareText = `Can you solve this ${puzzle?.rating ?? 1200} Elo puzzle on Chess Reel?`;
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
      await navigator.clipboard.writeText(`${shareText}\n${shareUrl}`);
      showToast("Link copied to clipboard!");
    } catch {
      showToast("Could not copy link");
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

  return (
    <div className="w-full flex flex-col items-center justify-between px-3 pb-24 max-w-sm mx-auto relative select-none">
      {/* Toast Notification Pill */}
      {toastMessage && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 px-3.5 py-1.5 rounded-full bg-[#18181B]/95 border border-[#3f3f46]/40 text-[#4edea3] text-xs font-bold shadow-2xl backdrop-blur-md animate-in fade-in zoom-in-95 duration-150">
          {toastMessage}
        </div>
      )}

      {/* Top Floating Reel HUD / Challenge Context */}
      <div className="w-full flex items-center justify-between gap-2 mt-1 mb-2 z-20">
        {/* Player Live Delta Pill */}
        <div className="flex items-center gap-1.5 bg-[#2a2a2c]/90 px-3 py-1.5 rounded-full shadow-md backdrop-blur-md border border-white/5" title={`Your Rating: ${currentElo}`}>
          <span className="sr-only">Your Rating:</span>
          <Zap className="w-3.5 h-3.5 text-[#4edea3] fill-[#4edea3]" />
          <span className="text-sm font-bold text-[#e5e1e4] tracking-tight">
            {currentElo}
          </span>
          {isCalibration ? (
            <span className="text-[10px] font-black text-[#38bdf8] uppercase tracking-wider">
              Test {calibrationStep}/6
            </span>
          ) : lastEloChange !== null && (
            <span
              className={`text-[11px] font-black ${
                lastEloChange >= 0 ? "text-[#4edea3]" : "text-[#EF4444]"
              }`}
            >
              {lastEloChange >= 0 ? `+${lastEloChange}` : lastEloChange}
            </span>
          )}
        </div>

        {/* Streak & Session Stats */}
        <div className="flex items-center gap-1.5">
          <div className="flex items-center gap-1 bg-[#2a2a2c]/90 px-3 py-1.5 rounded-full shadow-md backdrop-blur-md border border-white/5">
            <Flame className="w-3.5 h-3.5 text-[#ffb95f] fill-[#ffb95f]" />
            <span className="text-sm font-bold text-[#ffb95f]">{streak}</span>
          </div>
          {onOpenStats && (
            <button
              onClick={() => {
                haptics.tap();
                onOpenStats();
              }}
              aria-label="Tactical stats summary"
              className="flex items-center justify-center w-8 h-8 rounded-full bg-[#2a2a2c]/90 text-[#bbcabf] hover:text-[#e5e1e4] active:scale-95 transition-transform shadow-md border border-white/5 cursor-pointer"
            >
              <Trophy className="w-4 h-4 text-[#bbcabf]" />
            </button>
          )}
        </div>
      </div>

      {/* Active Puzzle Mission Brief */}
      <div className="w-full flex items-center justify-between mb-2 px-1">
        <div className="flex items-center gap-2">
          <span
            className={`w-3.5 h-3.5 rounded-full ring-2 shadow-sm shrink-0 transition-transform ${
              boardOrientation === "white"
                ? "bg-white ring-neutral-400 shadow-white/30"
                : "bg-neutral-950 ring-neutral-500 shadow-black/80"
            }`}
          />
          <span className="text-base font-bold tracking-tight text-[#e5e1e4]">
            {playerTurnMessage}
          </span>
        </div>
        <div className="flex items-center gap-1.5 bg-[#201f21]/70 px-2.5 py-1 rounded-full border border-white/5">
          <Brain className="w-3.5 h-3.5 text-[#4edea3]" />
          <span className="text-[11px] font-bold text-[#bbcabf] uppercase tracking-wider">
            {themeList[0] ?? "Mate in 2"}
          </span>
        </div>
      </div>

      {/* Central Playing Theater + Floating Reel Side Controls */}
      <div className="relative w-full max-w-[min(88vw,350px)] aspect-square flex items-center justify-center my-1">
        {/* Chessboard Container (1:1 Ratio Tournament Dimensions) */}
        <div
          data-testid="chessboard-container"
          className={`relative w-full h-full rounded-2xl bg-[#262421] p-2 shadow-2xl overflow-hidden flex flex-col justify-between transition-all duration-300 ring-1 touch-none ${
            isShaking ? "animate-board-shake" : ""
          } ${
            status === "solved"
              ? "ring-[#4edea3]/70 shadow-[0_0_35px_rgba(78,222,163,0.35)]"
              : mistakeFeedback
              ? "ring-[#EF4444]/70 shadow-[0_0_30px_rgba(239,68,68,0.35)]"
              : "ring-white/10 shadow-black/80"
          }`}
        >
          {/* Subtle Board Rim Glow on Action */}
          <div className="absolute inset-0 pointer-events-none rounded-2xl shadow-[inset_0_0_20px_rgba(78,222,163,0.12)]" />

          {fen ? (
            <Chessboard
              options={{
                id: `board-${puzzle?.id ?? "active"}`,
                position: fen,
                boardOrientation: boardOrientation,
                onPieceDrop: handlePieceDrop,
                onSquareClick: handleSquareClick,
                squareStyles: highlightStyles,
                animationDurationInMs: 220,
                showNotation: true,
                darkSquareStyle: { backgroundColor: "#262421" },
                lightSquareStyle: { backgroundColor: "#3D3B38" },
                dropSquareStyle: {
                  boxShadow: "inset 0 0 1px 3px rgba(78, 222, 163, 0.9)",
                },
              }}
            />
          ) : (
            <div className="w-full h-full bg-[#121214] flex items-center justify-center">
              <div className="w-8 h-8 border-2 border-[#4edea3] border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {/* Solved Celebration Hero Overlay */}
          {status === "solved" && !isReviewing && (
            <div className="absolute inset-0 bg-[#0A0A0A]/85 backdrop-blur-md flex flex-col items-center justify-center p-4 animate-in fade-in zoom-in-95 duration-250 z-20">
              <div className="relative mb-3">
                <div className="absolute -inset-3 bg-[#4edea3]/30 rounded-full blur-xl animate-pulse" />
                <div className="relative p-3.5 bg-gradient-to-tr from-[#10b981] to-[#4edea3] text-[#002113] rounded-full shadow-2xl">
                  <Trophy className="w-9 h-9 stroke-[2.5]" />
                </div>
              </div>

              <div className="text-xl sm:text-2xl font-black text-white tracking-tight uppercase mb-1 drop-shadow-md flex items-center gap-1.5">
                <span>Puzzle Solved!</span>
                <Sparkles className="w-5 h-5 text-[#ffb95f] fill-[#ffb95f]" />
              </div>

              <div className="flex items-center gap-2 mb-4">
                {lastEloChange !== null && (
                  <span className="px-2.5 py-1 rounded-full bg-[#10b981]/20 border border-[#10b981]/40 text-[#4edea3] text-xs font-black tracking-wide">
                    {lastEloChange >= 0 ? `+${lastEloChange}` : lastEloChange} Elo
                  </span>
                )}
                {streak > 0 && (
                  <span className="px-2.5 py-1 rounded-full bg-[#ffb95f]/20 border border-[#ffb95f]/40 text-[#ffb95f] text-xs font-black flex items-center gap-1">
                    <Flame className="w-3.5 h-3.5 fill-[#ffb95f]" />
                    <span>{streak} Streak!</span>
                  </span>
                )}
              </div>

              {/* Action buttons inside the celebration overlay */}
              <div className="w-full max-w-[240px] flex flex-col gap-2 pointer-events-auto">
                <button
                  onClick={() => {
                    haptics.tap();
                    onNextPuzzle();
                  }}
                  className="w-full h-11 bg-[#10b981] hover:bg-[#4edea3] text-[#002113] font-black rounded-xl shadow-lg shadow-[#10b981]/30 flex items-center justify-center gap-2 transition-transform active:scale-95 cursor-pointer"
                >
                  <span>Next Reel</span>
                  {autoNextCountdown !== null && (
                    <span className="text-xs bg-[#002113]/20 px-2 py-0.5 rounded-full font-mono">
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
                  className="w-full h-9 text-xs text-[#bbcabf] hover:text-white hover:bg-white/10 flex items-center justify-center gap-1.5 rounded-lg cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Review Board</span>
                </button>
              </div>
            </div>
          )}

          {/* Solved Mini Badge if reviewing */}
          {status === "solved" && isReviewing && (
            <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#10b981]/30 border border-[#10b981]/50 backdrop-blur-md text-[#4edea3] text-xs font-bold shadow-lg animate-in fade-in">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Solved</span>
            </div>
          )}
        </div>

        {/* Right Reel Action Stack (TikTok/Reel Paradigm) */}
        <aside className="absolute -right-3 sm:-right-4 flex flex-col items-center gap-2.5 z-30">
          {/* Bookmark / Save Pattern */}
          <button
            onClick={handleToggleBookmark}
            aria-label="Save puzzle pattern"
            className={`w-10 h-10 rounded-full bg-[#27272a]/70 backdrop-blur-xl border border-white/10 flex flex-col items-center justify-center shadow-lg active:scale-90 transition-transform cursor-pointer ${
              isBookmarked ? "text-[#ffb95f]" : "text-[#e5e1e4]"
            }`}
          >
            <Bookmark
              className={`w-4 h-4 ${isBookmarked ? "fill-[#ffb95f]" : ""}`}
            />
            <span className="text-[8px] font-bold text-[#bbcabf]">Save</span>
          </button>

          {/* Sound Haptic Toggle */}
          <button
            onClick={handleToggleSFX}
            aria-label="Toggle piece sound"
            className={`w-10 h-10 rounded-full bg-[#27272a]/70 backdrop-blur-xl border border-white/10 flex flex-col items-center justify-center shadow-lg active:scale-90 transition-transform cursor-pointer ${
              isMuted ? "text-[#bbcabf]" : "text-[#4edea3]"
            }`}
          >
            {isMuted ? (
              <VolumeX className="w-4 h-4" />
            ) : (
              <Volume2 className="w-4 h-4" />
            )}
            <span className="text-[8px] font-bold text-[#bbcabf]">SFX</span>
          </button>

          {/* Share Tactical Reel Card */}
          <button
            onClick={handleShare}
            aria-label="Share puzzle card"
            className="w-10 h-10 rounded-full bg-[#27272a]/70 backdrop-blur-xl border border-white/10 flex flex-col items-center justify-center text-[#e5e1e4] hover:text-[#4edea3] shadow-lg active:scale-90 transition-transform cursor-pointer"
          >
            <Share2 className="w-4 h-4" />
            <span className="text-[8px] font-bold text-[#bbcabf]">Share</span>
          </button>

          {/* Flip Board Orientation */}
          <button
            onClick={handleFlipBoard}
            aria-label="Flip board"
            className="w-10 h-10 rounded-full bg-[#27272a]/70 backdrop-blur-xl border border-white/10 flex flex-col items-center justify-center text-[#e5e1e4] hover:text-[#4edea3] shadow-lg active:scale-90 transition-transform cursor-pointer"
          >
            <ArrowUpDown className="w-4 h-4" />
            <span className="text-[8px] font-bold text-[#bbcabf]">Flip</span>
          </button>
        </aside>
      </div>

      {/* Blunder State Banner (If mistake was made) */}
      {mistakeFeedback && (
        <div className="w-full bg-[#EF4444]/15 border border-[#EF4444]/40 rounded-xl p-3 my-1.5 shadow-lg flex items-center justify-between gap-2 animate-in fade-in duration-150">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-[#EF4444] shrink-0" />
            <div>
              <div className="text-xs font-bold text-[#EF4444]">
                Inaccurate Move
              </div>
              <div className="text-[11px] text-[#e5e1e4]/80">
                Look for forcing checks, captures, or pins!
              </div>
            </div>
          </div>
          <button
            onClick={() => {
              haptics.tap();
              initializePuzzle();
            }}
            className="px-2.5 py-1 rounded-lg bg-[#EF4444]/20 hover:bg-[#EF4444]/30 text-white text-xs font-bold flex items-center gap-1 shrink-0 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Retry</span>
          </button>
        </div>
      )}

      {/* Below Board HUD: Glassmorphic Tactical Info Card */}
      <div className="w-full bg-[#201f21]/80 backdrop-blur-lg border border-white/5 rounded-xl p-3 shadow-xl flex flex-col gap-2 mt-2">
        {/* Meta & Category Row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-[#bbcabf]">Puzzle Elo</span>
            <span className="text-sm font-bold text-[#e5e1e4]">
              {puzzle ? puzzle.rating : "---"}
            </span>
          </div>

          {/* Tactical Pattern Badges */}
          <div className="flex items-center gap-1.5">
            {themeList.map((tag) => (
              <span
                key={tag}
                className="bg-[#4edea3]/15 text-[#4edea3] text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider font-bold"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>

        {/* Multi-step Puzzle Progress Track */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-[#e5e1e4] font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#4edea3]" />
              Step {currentStep} of {totalPlayerMoves}
            </span>
            <span className="text-[#bbcabf] text-[10px] font-bold uppercase tracking-wider">
              {status === "solved"
                ? "Tactics Mastered"
                : hintActive
                ? "Hint Activated"
                : "Find the continuation"}
            </span>
          </div>

          {/* Visual Multi-segment Progress Bar */}
          <div className="w-full h-1.5 bg-[#39393b] rounded-full overflow-hidden flex gap-1">
            {Array.from({ length: totalPlayerMoves }).map((_, i) => (
              <div
                key={i}
                className={`h-full rounded-full flex-1 transition-all duration-300 ${
                  i < currentStep || status === "solved"
                    ? "bg-[#4edea3] shadow-[0_0_8px_rgba(78,222,163,0.6)]"
                    : "bg-[#353437]"
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Action Bar: Tactical Solver Controls */}
      <div className="w-full flex items-center gap-2 mt-2">
        {/* Secondary Hint Button with Outline Styling */}
        <button
          onClick={handleTriggerHint}
          disabled={status !== "playing"}
          className={`flex-1 h-12 rounded-xl border border-white/5 flex items-center justify-center gap-2 text-[#e5e1e4] shadow-md active:scale-95 transition-all cursor-pointer ${
            hintUsed
              ? "bg-[#2a2a2c]/50 text-[#bbcabf]"
              : "bg-[#2a2a2c]/90 hover:bg-[#39393b]"
          }`}
        >
          <Lightbulb className="w-4 h-4 text-[#ffb95f]" />
          <span className="text-sm font-semibold">Hint</span>
          <span className="bg-[#ffb95f]/20 text-[#ffb95f] text-[9px] px-1.5 py-0.5 rounded uppercase font-bold">
            {hintUsed ? "Used" : "1 Left"}
          </span>
        </button>

        {/* Next Reel Button */}
        <button
          onClick={() => {
            haptics.tap();
            onNextPuzzle();
          }}
          aria-label="Next puzzle"
          className={`flex-1 h-12 rounded-xl flex items-center justify-center gap-2 font-bold text-sm shadow-md active:scale-95 transition-all cursor-pointer ${
            status === "solved"
              ? "bg-[#10b981] hover:bg-[#4edea3] text-[#002113] shadow-[0_0_20px_rgba(16,185,129,0.35)]"
              : "bg-[#2a2a2c] hover:bg-[#39393b] text-[#e5e1e4] border border-white/5"
          }`}
        >
          {status === "solved" ? (
            <>
              <ArrowRight className="w-4 h-4" />
              <span>Solved! Next</span>
            </>
          ) : (
            <>
              <FastForward className="w-4 h-4 text-[#bbcabf]" />
              <span>Skip Reel</span>
            </>
          )}
        </button>
      </div>

      {/* Snap Scroll Invitation Hint */}
      <div className="flex flex-col items-center justify-center gap-0.5 mt-3 text-[#bbcabf]/60 animate-bounce">
        <span className="text-[10px] font-bold uppercase tracking-widest">
          Swipe up for next reel
        </span>
        <ChevronDown className="w-4 h-4" />
      </div>
    </div>
  );
}
