"use client";

import React, { useState, useEffect } from "react";
import {
  User,
  Zap,
  Flame,
  Bookmark,
  Volume2,
  VolumeX,
  X,
  Trash2,
  ExternalLink,
  RotateCcw,
  ShieldCheck,
  UserPlus,
  LogOut,
} from "lucide-react";
import { sounds } from "@/lib/audio";
import { getTier } from "./LeaderboardModal";
import { UserAvatar } from "@/components/UserAvatar";

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentElo: number;
  streak: number;
  guestId: string;
  userAccount?: {
    id: string;
    username: string;
    displayName?: string;
    avatar?: string;
    isCalibrated?: boolean;
  } | null;
  onOpenAuth?: () => void;
  onOpenLanding?: () => void;
  onSignOut?: () => void;
  onResetElo?: () => void;
}

export function ProfileModal({
  isOpen,
  onClose,
  currentElo,
  streak,
  guestId,
  userAccount,
  onOpenAuth,
  onOpenLanding,
  onSignOut,
  onResetElo,
}: ProfileModalProps) {
  const [bookmarks, setBookmarks] = useState<string[]>([]);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [showResetConfirm, setShowResetConfirm] = useState<boolean>(false);
  const [peakElo, setPeakElo] = useState<number>(currentElo);
  const [bestStreak, setBestStreak] = useState<number>(streak);

  // Load bookmarks & sound preferences from localStorage asynchronously
  useEffect(() => {
    if (!isOpen || typeof window === "undefined") return;

    const timer = setTimeout(() => {
      try {
        // Bookmarks
        const rawBookmarks = window.localStorage.getItem("chess_reel_bookmarks");
        if (rawBookmarks) {
          setBookmarks(JSON.parse(rawBookmarks));
        }

        // Mute state
        setIsMuted(sounds.getIsMuted());

        // Peak Elo
        const savedPeak = window.localStorage.getItem("chess_reel_peak_elo");
        const numPeak = savedPeak ? Number.parseInt(savedPeak, 10) : currentElo;
        const effectivePeak = Math.max(numPeak, currentElo);
        setPeakElo(effectivePeak);
        window.localStorage.setItem("chess_reel_peak_elo", effectivePeak.toString());

        // Best Streak
        const savedBestStreak = window.localStorage.getItem("chess_reel_best_streak");
        const numStreak = savedBestStreak ? Number.parseInt(savedBestStreak, 10) : streak;
        const effectiveStreak = Math.max(numStreak, streak);
        setBestStreak(effectiveStreak);
        window.localStorage.setItem("chess_reel_best_streak", effectiveStreak.toString());
      } catch (e) {
        console.warn("Error accessing profile data:", e);
      }
    }, 0);

    return () => clearTimeout(timer);
  }, [isOpen, currentElo, streak]);

  if (!isOpen) return null;

  const currentTier = getTier(currentElo);

  // Toggle Mute
  const handleToggleMute = () => {
    const next = sounds.toggleMute();
    setIsMuted(next);
  };

  // Remove a bookmark
  const handleRemoveBookmark = (idToRemove: string) => {
    try {
      const updated = bookmarks.filter((id) => id !== idToRemove);
      setBookmarks(updated);
      if (typeof window !== "undefined") {
        window.localStorage.setItem("chess_reel_bookmarks", JSON.stringify(updated));
      }
    } catch (e) {
      console.warn("Could not remove bookmark:", e);
    }
  };

  // Handle Reset Elo
  const handleConfirmReset = () => {
    if (onResetElo) {
      onResetElo();
    }
    setShowResetConfirm(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="w-full max-w-md max-h-[90vh] flex flex-col rounded-2xl bg-[#121214] border border-[#27272a] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="profile-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#27272a] bg-[#18181B]/80 backdrop-blur-sm">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-[#4edea3]">
              <User className="w-4 h-4" />
            </div>
            <div>
              <h2 id="profile-title" className="text-base font-bold text-[#e5e1e4] tracking-tight">
                Player Profile
              </h2>
              <p className="text-[11px] text-[#bbcabf] font-medium">
                {userAccount ? `@${userAccount.username}` : "Guest Account"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close profile"
            className="w-8 h-8 rounded-full flex items-center justify-center text-[#bbcabf] hover:text-white bg-[#201f21] hover:bg-[#2a2a2c] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Identity Card */}
          {userAccount ? (
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#18181B] border border-white/5">
              <div className="flex items-center gap-3.5">
                <div className="relative">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-[#10b981] to-[#4edea3] flex items-center justify-center text-[#002113] font-black text-xl shadow-md overflow-hidden shrink-0">
                    <UserAvatar
                      avatar={userAccount.avatar}
                      fallback="♟"
                      className="w-full h-full flex items-center justify-center text-xl font-black text-[#002113]"
                    />
                  </div>
                  <div className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-[#10b981] ring-2 ring-[#121214]" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-white">
                      {userAccount.displayName || userAccount.username}
                    </span>
                    <span className="text-[10px] text-[#4edea3] font-mono bg-[#4edea3]/10 px-1.5 py-0.5 rounded border border-[#4edea3]/20">
                      Verified
                    </span>
                  </div>
                  <div className="text-[11px] text-[#bbcabf] font-mono mt-0.5">
                    @{userAccount.username}
                  </div>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span
                      className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
                      style={{ color: currentTier.color, backgroundColor: currentTier.bg }}
                    >
                      {currentTier.name}
                    </span>
                    <span className="text-[10px] font-semibold text-[#bbcabf]">
                      {userAccount.isCalibrated ? "Calibrated" : "Placement In Progress"}
                    </span>
                  </div>
                </div>
              </div>

              {onSignOut && (
                <button
                  onClick={onSignOut}
                  title="Switch / Sign out"
                  className="p-2 rounded-lg bg-[#201f21] hover:bg-[#2a2a2c] text-[#bbcabf] hover:text-red-400 transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              )}
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-gradient-to-br from-[#18181B] to-[#201f21] border border-amber-500/30 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 font-black text-lg">
                  ♟
                </div>
                <div>
                  <div className="text-sm font-bold text-white">Guest Tactician</div>
                  <div className="text-[11px] text-[#bbcabf] font-mono">
                    ID: #{guestId.slice(0, 12)}...
                  </div>
                </div>
              </div>

              <p className="text-xs text-[#bbcabf] leading-relaxed">
                Create an account to calibrate your baseline tactical Elo through our placement test and compete against your friends on the leaderboard!
              </p>

              {onOpenAuth && (
                <button
                  onClick={() => {
                    onClose();
                    onOpenAuth();
                  }}
                  className="w-full py-2.5 rounded-xl bg-[#4edea3] hover:bg-[#10b981] text-[#002113] font-bold text-xs uppercase tracking-wider transition-all cursor-pointer shadow-md flex items-center justify-center gap-1.5 active:scale-98"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Create Account / Sign In</span>
                </button>
              )}
            </div>
          )}

          {/* 4 Stats Cards */}
          <div className="grid grid-cols-2 gap-2.5">
            {/* Current Rating */}
            <div className="p-3 rounded-xl bg-[#18181B]/80 border border-white/5 flex flex-col justify-between">
              <div className="flex items-center justify-between text-[#bbcabf] mb-1">
                <span className="text-[11px] font-semibold uppercase tracking-wider">Current</span>
                <Zap className="w-3.5 h-3.5 text-[#4edea3]" />
              </div>
              <div className="text-xl font-black text-[#4edea3] tracking-tight">{currentElo}</div>
              <span className="text-[10px] text-[#bbcabf]">Live tactical rating</span>
            </div>

            {/* Peak Rating */}
            <div className="p-3 rounded-xl bg-[#18181B]/80 border border-white/5 flex flex-col justify-between">
              <div className="flex items-center justify-between text-[#bbcabf] mb-1">
                <span className="text-[11px] font-semibold uppercase tracking-wider">Peak</span>
                <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
              </div>
              <div className="text-xl font-black text-white tracking-tight">{peakElo}</div>
              <span className="text-[10px] text-[#bbcabf]">All-time best</span>
            </div>

            {/* Current Streak */}
            <div className="p-3 rounded-xl bg-[#18181B]/80 border border-white/5 flex flex-col justify-between">
              <div className="flex items-center justify-between text-[#bbcabf] mb-1">
                <span className="text-[11px] font-semibold uppercase tracking-wider">Streak</span>
                <Flame className="w-3.5 h-3.5 text-[#ffb95f]" />
              </div>
              <div className="text-xl font-black text-[#ffb95f] tracking-tight">{streak}</div>
              <span className="text-[10px] text-[#bbcabf]">Consecutive wins</span>
            </div>

            {/* Best Streak */}
            <div className="p-3 rounded-xl bg-[#18181B]/80 border border-white/5 flex flex-col justify-between">
              <div className="flex items-center justify-between text-[#bbcabf] mb-1">
                <span className="text-[11px] font-semibold uppercase tracking-wider">Best Run</span>
                <Flame className="w-3.5 h-3.5 text-amber-500" />
              </div>
              <div className="text-xl font-black text-white tracking-tight">{bestStreak}</div>
              <span className="text-[10px] text-[#bbcabf]">Record streak</span>
            </div>
          </div>

          {/* Bookmarked Puzzles Section */}
          <div className="pt-2 border-t border-white/5">
            <div className="flex items-center justify-between mb-2 px-1">
              <div className="flex items-center gap-1.5">
                <Bookmark className="w-3.5 h-3.5 text-[#4edea3]" />
                <span className="text-xs font-bold uppercase tracking-wider text-[#e5e1e4]">
                  Saved Puzzles ({bookmarks.length})
                </span>
              </div>
              <span className="text-[10px] text-[#bbcabf]">Stored in browser</span>
            </div>

            {bookmarks.length === 0 ? (
              <div className="p-4 rounded-xl bg-[#18181B]/50 border border-dashed border-white/10 text-center text-xs text-[#bbcabf]">
                No bookmarks saved yet. Tap the 🔖 icon on any puzzle reel to bookmark it for later study!
              </div>
            ) : (
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {bookmarks.map((puzzleId) => (
                  <div
                    key={puzzleId}
                    className="flex items-center justify-between px-3 py-2 rounded-xl bg-[#18181B] border border-white/5 hover:border-white/10 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[#4edea3]" />
                      <span className="text-xs font-mono font-bold text-white">
                        Puzzle #{puzzleId}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <a
                        href={`https://lichess.org/training/${puzzleId}`}
                        target="_blank"
                        rel="noreferrer"
                        title="View on Lichess"
                        className="p-1 rounded-md text-[#bbcabf] hover:text-[#4edea3] hover:bg-white/5 transition-colors cursor-pointer"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                      <button
                        onClick={() => handleRemoveBookmark(puzzleId)}
                        title="Remove bookmark"
                        className="p-1 rounded-md text-[#bbcabf] hover:text-[#EF4444] hover:bg-white/5 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Preferences & Audio Control */}
          <div className="pt-2 border-t border-white/5 space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#bbcabf] block px-1">
              Preferences
            </span>
            <div className="flex items-center justify-between p-3 rounded-xl bg-[#18181B]/70 border border-white/5">
              <div className="flex items-center gap-2.5">
                {isMuted ? (
                  <VolumeX className="w-4 h-4 text-neutral-500" />
                ) : (
                  <Volume2 className="w-4 h-4 text-[#4edea3]" />
                )}
                <div>
                  <div className="text-xs font-semibold text-white">Sound Effects (SFX)</div>
                  <div className="text-[10px] text-[#bbcabf]">
                    {isMuted ? "Sound muted" : "Audio active (moves & fanfare)"}
                  </div>
                </div>
              </div>

              <button
                onClick={handleToggleMute}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  isMuted
                    ? "bg-[#2a2a2c] text-[#bbcabf] hover:text-white"
                    : "bg-[#10b981]/20 text-[#4edea3] border border-[#10b981]/40"
                }`}
              >
                {isMuted ? "Unmute" : "Muted"}
              </button>
            </div>

            {onOpenLanding && (
              <button
                onClick={() => {
                  onClose();
                  onOpenLanding();
                }}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-[#18181B]/70 border border-white/5 hover:border-white/15 transition-all text-left cursor-pointer group"
              >
                <div>
                  <div className="text-xs font-semibold text-white group-hover:text-[#4edea3] transition-colors">
                    About Chess Reel &amp; Account Elo
                  </div>
                  <div className="text-[10px] text-[#bbcabf]">
                    View feature showcase &amp; placement guide
                  </div>
                </div>
                <span className="text-xs text-[#bbcabf] group-hover:text-[#4edea3] transition-colors">
                  →
                </span>
              </button>
            )}
          </div>

          {/* Reset Progress Section */}
          <div className="pt-2 border-t border-white/5">
            {showResetConfirm ? (
              <div className="p-3 rounded-xl bg-[#EF4444]/10 border border-[#EF4444]/30 space-y-2">
                <div className="text-xs font-bold text-[#EF4444]">
                  Reset Elo back to 800 and clear streak?
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleConfirmReset}
                    className="flex-1 py-1.5 rounded-lg bg-[#EF4444] hover:bg-red-600 text-white font-bold text-xs transition-colors cursor-pointer"
                  >
                    Yes, Reset
                  </button>
                  <button
                    onClick={() => setShowResetConfirm(false)}
                    className="flex-1 py-1.5 rounded-lg bg-[#2a2a2c] text-[#bbcabf] hover:text-white font-bold text-xs transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowResetConfirm(true)}
                className="w-full flex items-center justify-center gap-1.5 py-2 text-[11px] font-semibold text-[#bbcabf]/70 hover:text-[#EF4444] transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset Tactical Rating & Progress</span>
              </button>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-[#27272a] bg-[#18181B]/60 flex justify-end">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-[#4edea3] hover:bg-[#10b981] text-[#002113] font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer shadow-md"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
