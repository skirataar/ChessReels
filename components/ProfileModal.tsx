"use client";

import React, { useState, useEffect, useRef } from "react";
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
  Sparkles,
  CheckCircle2,
  Crown,
  Lock,
  Camera,
  Upload,
  Check,
} from "lucide-react";
import { sounds } from "@/lib/audio";
import { getTier } from "./LeaderboardModal";
import { UserAvatar } from "@/components/UserAvatar";
import { CURATED_AVATARS, compressImageFile, persistAvatar } from "@/lib/avatarUpload";

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentElo: number;
  streak: number;
  dailyStreak?: number;
  solveStreak?: number;
  guestId: string;
  userAccount?: {
    id: string;
    username: string;
    displayName?: string;
    avatar?: string;
    isCalibrated?: boolean;
    plan?: string;
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
  dailyStreak = 0,
  solveStreak = 0,
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
  const [isUpgraded, setIsUpgraded] = useState<boolean>(
    userAccount?.plan === "premium"
  );
  const [activeAvatar, setActiveAvatar] = useState<string | undefined>(userAccount?.avatar);
  const [isDpPickerOpen, setIsDpPickerOpen] = useState<boolean>(false);
  const [isUploadingDp, setIsUploadingDp] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync bookmark & sound preferences from localStorage asynchronously
  useEffect(() => {
    if (!isOpen || typeof window === "undefined") return;

    try {
      const customDp = window.localStorage.getItem("chess_reel_custom_dp");
      setActiveAvatar(userAccount?.avatar || customDp || undefined);

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

      // Simulated local plan state if upgraded in this session
      const savedPlan = window.localStorage.getItem("chess_reel_plan");
      if (savedPlan === "premium" || userAccount?.plan === "premium") {
        setIsUpgraded(true);
      }
    } catch (e) {
      console.warn("Error accessing profile data:", e);
    }
  }, [isOpen, currentElo, streak, userAccount]);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setIsUploadingDp(true);
      const compressedDataUrl = await compressImageFile(file, 256);
      setActiveAvatar(compressedDataUrl);
      await persistAvatar(compressedDataUrl, userAccount?.id);
      setIsDpPickerOpen(false);
    } catch (err: any) {
      console.error("Failed to upload photo:", err);
    } finally {
      setIsUploadingDp(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSelectPreset = async (url: string) => {
    try {
      setActiveAvatar(url);
      await persistAvatar(url, userAccount?.id);
      setIsDpPickerOpen(false);
    } catch (err) {
      console.error("Failed to set avatar preset:", err);
    }
  };

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

  // Toggle demo subscription upgrade
  const handleUpgradeSubscription = () => {
    const nextState = !isUpgraded;
    setIsUpgraded(nextState);
    if (typeof window !== "undefined") {
      window.localStorage.setItem("chess_reel_plan", nextState ? "premium" : "free");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="w-full max-w-md max-h-[92vh] flex flex-col rounded-2xl bg-[#151413] border border-white/10 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 text-[#f5f5f5]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="profile-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-[#22201e]/80 backdrop-blur-sm">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#c29b78]/15 border border-[#c29b78]/30 flex items-center justify-center text-[#c29b78]">
              <User className="w-4 h-4" />
            </div>
            <div>
              <h2 id="profile-title" className="text-base font-bold text-[#f5f5f5] tracking-tight">
                Player Profile &amp; Streaks
              </h2>
              <p className="text-[11px] text-[#a3a3a3] font-medium">
                {userAccount ? `@${userAccount.username}` : "Guest Tactician"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close profile"
            className="w-8 h-8 rounded-full flex items-center justify-center text-[#a3a3a3] hover:text-[#f5f5f5] bg-[#22201e] hover:bg-[#2d2a28] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Hidden File Input for DP */}
          <input
            type="file"
            ref={fileInputRef}
            accept="image/*"
            onChange={handlePhotoUpload}
            className="hidden"
          />

          {/* Identity Card */}
          {userAccount ? (
            <div className="flex flex-col p-3.5 rounded-xl bg-[#22201e] border border-white/10 shadow-md">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3.5">
                  <div
                    className="relative group cursor-pointer"
                    onClick={() => setIsDpPickerOpen(!isDpPickerOpen)}
                    title="Change display picture"
                  >
                    <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-[#c29b78] to-[#e8d3b9] flex items-center justify-center text-[#151413] font-black text-xl shadow-md overflow-hidden shrink-0 group-hover:ring-2 group-hover:ring-[#c29b78] transition-all">
                      <UserAvatar
                        avatar={activeAvatar}
                        fallback="♟"
                        className="w-full h-full flex items-center justify-center text-xl font-black text-[#151413]"
                      />
                    </div>
                    <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-[#c29b78] text-[#151413] flex items-center justify-center shadow-md">
                      <Camera className="w-2.5 h-2.5 stroke-[2.5]" />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-white">
                        {userAccount.displayName || userAccount.username}
                      </span>
                      <span className="text-[10px] text-[#c29b78] font-mono bg-[#c29b78]/15 px-1.5 py-0.5 rounded border border-[#c29b78]/30 font-bold">
                        {isUpgraded ? "PRO" : "FREE"}
                      </span>
                    </div>
                    <div className="text-[11px] text-[#a3a3a3] font-mono mt-0.5">
                      @{userAccount.username}
                    </div>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span
                        className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
                        style={{ color: currentTier.color, backgroundColor: currentTier.bg }}
                      >
                        {currentTier.name}
                      </span>
                    </div>
                  </div>
                </div>

                {onSignOut && (
                  <button
                    onClick={onSignOut}
                    title="Sign out of account"
                    className="p-2 rounded-xl bg-[#151413] hover:bg-[#2d2a28] text-[#a3a3a3] hover:text-red-400 border border-white/5 transition-colors cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* DP Picker Drawer */}
              {isDpPickerOpen && (
                <div className="mt-3 pt-3 border-t border-white/10 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-white flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-[#c29b78]" />
                      Display Picture
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsDpPickerOpen(false)}
                      className="text-xs text-[#a3a3a3] hover:text-white cursor-pointer"
                    >
                      Done
                    </button>
                  </div>

                  <button
                    type="button"
                    disabled={isUploadingDp}
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-[#c29b78] to-[#d4b08f] text-[#151413] font-black text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-md mb-2.5 active:scale-98"
                  >
                    <Upload className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>{isUploadingDp ? "Compressing..." : "Upload Photo"}</span>
                  </button>

                  <div className="grid grid-cols-4 gap-2">
                    {CURATED_AVATARS.map((preset) => {
                      const isSelected = activeAvatar === preset.url;
                      return (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => handleSelectPreset(preset.url)}
                          className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-all cursor-pointer group ${
                            isSelected
                              ? "border-[#c29b78] ring-2 ring-[#c29b78]/40 scale-102"
                              : "border-white/10 hover:border-[#c29b78]/50"
                          }`}
                        >
                          <img
                            src={preset.url}
                            alt={preset.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                          {isSelected && (
                            <div className="absolute top-1 right-1 w-3.5 h-3.5 rounded-full bg-[#c29b78] text-[#151413] flex items-center justify-center shadow-md">
                              <Check className="w-2 h-2 stroke-[3]" />
                            </div>
                          )}
                          <span className="absolute bottom-0 inset-x-0 bg-black/75 text-[8px] font-bold text-white py-0.5 truncate px-1 text-center">
                            {preset.name}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-gradient-to-br from-[#22201e] to-[#2d2a28] border border-[#c29b78]/30 space-y-3 shadow-md">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full bg-[#c29b78]/15 border border-[#c29b78]/40 flex items-center justify-center text-[#c29b78] font-black text-lg">
                    ♟
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white flex items-center gap-1.5">
                      <span>Guest Tactician</span>
                      <span className="text-[10px] text-amber-400 bg-amber-400/10 px-1.5 py-0.2 rounded border border-amber-400/20 font-bold">
                        Unsaved
                      </span>
                    </div>
                    <div className="text-[11px] text-[#a3a3a3] font-mono">
                      Guest ID: #{guestId.slice(0, 10)}...
                    </div>
                  </div>
                </div>
              </div>

              <p className="text-xs text-[#a3a3a3] leading-relaxed">
                Create a password-protected account or continue with Google to permanently save your rating, streaks, and access ad-free reels.
              </p>

              {onOpenAuth && (
                <button
                  onClick={() => {
                    onClose();
                    onOpenAuth();
                  }}
                  className="w-full py-2.5 rounded-xl bg-[#c29b78] hover:bg-[#d4b08f] text-[#151413] font-black text-xs uppercase tracking-wider transition-all cursor-pointer shadow-md shadow-[#c29b78]/25 flex items-center justify-center gap-1.5 active:scale-98"
                >
                  <UserPlus className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>Create Account / Sign In</span>
                </button>
              )}
            </div>
          )}

          {/* Dedicated Streaks & Tactical Metrics Grid */}
          <div>
            <div className="flex items-center justify-between mb-2 px-1">
              <span className="text-xs font-bold uppercase tracking-wider text-[#f5f5f5] flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                <span>Streaks &amp; Performance</span>
              </span>
              <span className="text-[10px] text-[#a3a3a3] font-mono">Real-time stats</span>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              {/* Daily Login Streak */}
              <div className="p-3 rounded-xl bg-[#22201e] border border-white/10 flex flex-col justify-between shadow-sm">
                <div className="flex items-center justify-between text-[#a3a3a3] mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider">Daily Streak</span>
                  <Flame className="w-4 h-4 text-amber-400 fill-amber-400" />
                </div>
                <div className="text-2xl font-black text-amber-400 tracking-tight font-mono">
                  {dailyStreak} <span className="text-xs font-semibold text-[#a3a3a3]">{dailyStreak === 1 ? "day" : "days"}</span>
                </div>
                <span className="text-[10px] text-[#a3a3a3] mt-0.5">Consecutive daily training</span>
              </div>

              {/* Solve Combo Streak (Right Answers) */}
              <div className="p-3 rounded-xl bg-[#22201e] border border-white/10 flex flex-col justify-between shadow-sm">
                <div className="flex items-center justify-between text-[#a3a3a3] mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider">Solve Combo</span>
                  <Zap className="w-4 h-4 text-[#c29b78] fill-[#c29b78]" />
                </div>
                <div className="text-2xl font-black text-[#c29b78] tracking-tight font-mono">
                  {solveStreak} <span className="text-xs font-semibold text-[#a3a3a3]">in a row</span>
                </div>
                <span className="text-[10px] text-[#a3a3a3] mt-0.5">Correct consecutive moves</span>
              </div>

              {/* Current Rating */}
              <div className="p-3 rounded-xl bg-[#22201e] border border-white/10 flex flex-col justify-between shadow-sm">
                <div className="flex items-center justify-between text-[#a3a3a3] mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider">Live Rating</span>
                  <ShieldCheck className="w-4 h-4 text-[#10b981]" />
                </div>
                <div className="text-2xl font-black text-[#10b981] tracking-tight font-mono">
                  {currentElo} <span className="text-xs font-semibold text-[#a3a3a3]">Elo</span>
                </div>
                <span className="text-[10px] text-[#a3a3a3] mt-0.5">Active puzzle baseline</span>
              </div>

              {/* Peak Rating */}
              <div className="p-3 rounded-xl bg-[#22201e] border border-white/10 flex flex-col justify-between shadow-sm">
                <div className="flex items-center justify-between text-[#a3a3a3] mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider">Peak Rating</span>
                  <Crown className="w-4 h-4 text-[#c29b78]" />
                </div>
                <div className="text-2xl font-black text-white tracking-tight font-mono">
                  {peakElo} <span className="text-xs font-semibold text-[#a3a3a3]">Elo</span>
                </div>
                <span className="text-[10px] text-[#a3a3a3] mt-0.5">All-time record</span>
              </div>
            </div>
          </div>

          {/* Subscription Tier Showcase (Free vs Premium) */}
          <div className="p-3.5 rounded-xl bg-gradient-to-r from-[#22201e] via-[#2a2724] to-[#22201e] border border-[#c29b78]/40 shadow-lg space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Crown className="w-4 h-4 text-[#c29b78]" />
                <span className="text-xs font-black uppercase tracking-wider text-[#f5f5f5]">
                  Membership Plan
                </span>
              </div>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                  isUpgraded
                    ? "bg-[#c29b78] text-[#151413] border-[#c29b78] shadow-sm font-black"
                    : "bg-white/5 text-[#a3a3a3] border-white/10"
                }`}
              >
                {isUpgraded ? "⭐ PRO ACTIVE" : "FREE TIER (ADS)"}
              </span>
            </div>

            <p className="text-[11px] text-[#a3a3a3] leading-relaxed">
              {isUpgraded
                ? "You have full access to 100% Ad-Free reels, Stockfish 16 deep move analysis, and custom tactical filters."
                : "Free tier includes infinite reels supported by non-intrusive ads. Upgrade to Pro for zero ads and Stockfish analysis."}
            </p>

            <button
              onClick={handleUpgradeSubscription}
              className={`w-full py-2 px-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md ${
                isUpgraded
                  ? "bg-[#22201e] hover:bg-[#2d2a28] text-[#a3a3a3] hover:text-white border border-white/10"
                  : "bg-[#c29b78] hover:bg-[#d4b08f] text-[#151413] shadow-[#c29b78]/30 active:scale-95"
              }`}
            >
              {isUpgraded ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#10b981]" />
                  <span>Pro Plan Active (Click to Toggle)</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>Upgrade to Premium Pro ($4.99/mo)</span>
                </>
              )}
            </button>
          </div>

          {/* Bookmarked Puzzles Section */}
          <div className="pt-2 border-t border-white/10">
            <div className="flex items-center justify-between mb-2 px-1">
              <div className="flex items-center gap-1.5">
                <Bookmark className="w-3.5 h-3.5 text-[#c29b78]" />
                <span className="text-xs font-bold uppercase tracking-wider text-[#f5f5f5]">
                  Saved Puzzles ({bookmarks.length})
                </span>
              </div>
              <span className="text-[10px] text-[#a3a3a3]">Stored in browser</span>
            </div>

            {bookmarks.length === 0 ? (
              <div className="p-3.5 rounded-xl bg-[#22201e]/60 border border-dashed border-white/10 text-center text-xs text-[#a3a3a3]">
                No bookmarks saved yet. Tap the 🔖 icon on any puzzle reel to bookmark it for later study!
              </div>
            ) : (
              <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                {bookmarks.map((puzzleId) => (
                  <div
                    key={puzzleId}
                    className="flex items-center justify-between px-3 py-2 rounded-xl bg-[#22201e] border border-white/10 hover:border-[#c29b78]/30 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[#c29b78]" />
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
                        className="p-1 rounded-md text-[#a3a3a3] hover:text-[#c29b78] hover:bg-white/5 transition-colors cursor-pointer"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                      <button
                        onClick={() => handleRemoveBookmark(puzzleId)}
                        title="Remove bookmark"
                        className="p-1 rounded-md text-[#a3a3a3] hover:text-[#ef4444] hover:bg-white/5 transition-colors cursor-pointer"
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
          <div className="pt-2 border-t border-white/10 space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#a3a3a3] block px-1">
              Preferences
            </span>
            <div className="flex items-center justify-between p-3 rounded-xl bg-[#22201e] border border-white/10">
              <div className="flex items-center gap-2.5">
                {isMuted ? (
                  <VolumeX className="w-4 h-4 text-neutral-500" />
                ) : (
                  <Volume2 className="w-4 h-4 text-[#c29b78]" />
                )}
                <div>
                  <div className="text-xs font-semibold text-white">Sound Effects (SFX)</div>
                  <div className="text-[10px] text-[#a3a3a3]">
                    {isMuted ? "Audio muted" : "Audio active (moves & fanfare)"}
                  </div>
                </div>
              </div>

              <button
                onClick={handleToggleMute}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  isMuted
                    ? "bg-[#151413] text-[#a3a3a3] hover:text-white border border-white/5"
                    : "bg-[#c29b78]/20 text-[#c29b78] border border-[#c29b78]/40"
                }`}
              >
                {isMuted ? "Unmute" : "Mute"}
              </button>
            </div>

            {onOpenLanding && (
              <button
                onClick={() => {
                  onClose();
                  onOpenLanding();
                }}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-[#22201e] border border-white/10 hover:border-[#c29b78]/40 transition-all text-left cursor-pointer group"
              >
                <div>
                  <div className="text-xs font-semibold text-white group-hover:text-[#c29b78] transition-colors">
                    About DoomChess &amp; Subscriptions
                  </div>
                  <div className="text-[10px] text-[#a3a3a3]">
                    Compare Free vs Premium plans
                  </div>
                </div>
                <span className="text-xs text-[#a3a3a3] group-hover:text-[#c29b78] transition-colors font-bold">
                  →
                </span>
              </button>
            )}
          </div>

          {/* Reset Rating Option */}
          <div className="pt-2 border-t border-white/10">
            {showResetConfirm ? (
              <div className="p-3 rounded-xl bg-[#ef4444]/15 border border-[#ef4444]/40 space-y-2">
                <div className="text-xs font-bold text-[#ef4444]">
                  Reset tactical rating back to 800 and clear streaks?
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleConfirmReset}
                    className="flex-1 py-1.5 rounded-lg bg-[#ef4444] hover:bg-red-600 text-white font-bold text-xs transition-colors cursor-pointer"
                  >
                    Yes, Reset
                  </button>
                  <button
                    onClick={() => setShowResetConfirm(false)}
                    className="flex-1 py-1.5 rounded-lg bg-[#22201e] text-[#a3a3a3] hover:text-white font-bold text-xs transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowResetConfirm(true)}
                className="w-full flex items-center justify-center gap-1.5 py-2 text-[11px] font-semibold text-[#a3a3a3]/70 hover:text-[#ef4444] transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset Tactical Rating &amp; Progress</span>
              </button>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-white/10 bg-[#22201e]/60 flex justify-end">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-[#c29b78] hover:bg-[#d4b08f] text-[#151413] font-black text-xs uppercase tracking-wider transition-colors cursor-pointer shadow-md shadow-[#c29b78]/25"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
