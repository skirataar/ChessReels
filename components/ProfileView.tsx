"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  User,
  Settings as SettingsIcon,
  Bookmark,
  Camera,
  Edit3,
  LayoutGrid,
  Heart,
  Clock,
  Flame,
  Snowflake,
  Zap,
  Trophy,
  Crown,
  ChevronRight,
  ChevronLeft,
  X,
  Play,
  Trash2,
  ExternalLink,
  CheckCircle2,
  XCircle,
  Sparkles,
  Check,
  Loader2,
  SlidersHorizontal,
  Menu,
} from "lucide-react";
import { UserAvatar } from "@/components/UserAvatar";
import { SettingsView } from "@/components/SettingsView";
import { PuzzleCard, PuzzleData, PuzzleStatus } from "@/components/PuzzleCard";
import { compressImageFile, persistAvatar } from "@/lib/avatarUpload";
import { getTier } from "@/components/LeaderboardModal";
import { formatTitle } from "@/lib/formatTitle";
import { haptics } from "@/lib/haptics";
import { isGuestAccount, isGuestUserId } from "@/lib/guestAccount";
import { sounds } from "@/lib/audio";

export interface ProfileViewProps {
  currentElo?: number;
  streak?: number;
  dailyStreak?: number;
  streakFreezes?: number;
  solveStreak?: number;
  guestId?: string;
  userAccount?: {
    id: string;
    username: string;
    displayName?: string;
    avatar?: string;
    plan?: string;
    elo?: number;
    email?: string;
    twoFactorEnabled?: boolean;
    peakElo?: number;
    streak?: number;
    bestStreak?: number;
    targetElo?: number | null;
  } | null;
  onOpenAuth?: () => void;
  onOpenLanding?: () => void;
  onSignOut?: () => void;
  onResetElo?: () => void;
  onOpenUpgrade?: () => void;
  onClose?: () => void;
  initialOpenSettings?: boolean;
}

interface SolvedHistoryItem {
  puzzleId: string;
  rating?: number;
  themes?: string;
  result: "win" | "loss";
  eloChange?: number;
  isLiked?: boolean;
  date?: string;
}

export function ProfileView({
  currentElo: propElo,
  streak: propStreak = 0,
  dailyStreak: propDailyStreak = 0,
  streakFreezes: propStreakFreezes = 0,
  solveStreak: propSolveStreak = 0,
  guestId = "guest",
  userAccount: propUserAccount,
  onOpenAuth,
  onOpenLanding,
  onSignOut,
  onResetElo,
  onOpenUpgrade,
  onClose,
  initialOpenSettings = false,
}: ProfileViewProps) {
  // Navigation & Submenu States
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(initialOpenSettings);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<"overview" | "saved" | "history">("overview");

  // Local synced account state
  const [account, setAccount] = useState<any>(propUserAccount || null);
  const [currentElo, setCurrentElo] = useState<number>(propElo ?? propUserAccount?.elo ?? 1000);
  const [dailyStreak, setDailyStreak] = useState<number>(propDailyStreak || propStreak || 0);
  const [streakFreezes, setStreakFreezes] = useState<number>(propStreakFreezes);
  const [bestCombo, setBestCombo] = useState<number>(propSolveStreak || 0);
  const [totalSolved, setTotalSolved] = useState<number>(0);
  const [totalFailed, setTotalFailed] = useState<number>(0);
  const [peakElo, setPeakElo] = useState<number>(propUserAccount?.peakElo || currentElo);
  const [targetElo, setTargetElo] = useState<number>(propUserAccount?.targetElo || 1500);

  // Avatar state
  const [activeAvatar, setActiveAvatar] = useState<string | undefined>(propUserAccount?.avatar);
  const [isUploadingDp, setIsUploadingDp] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Edit Profile form state
  const [editUsername, setEditUsername] = useState<string>(propUserAccount?.username || "");
  const [editDisplayName, setEditDisplayName] = useState<string>(propUserAccount?.displayName || "");
  const [editTargetElo, setEditTargetElo] = useState<number>(propUserAccount?.targetElo || 1500);
  const [isSavingProfile, setIsSavingProfile] = useState<boolean>(false);
  const [editProfileMsg, setEditProfileMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Bookmarks & Saved Puzzles state
  const [bookmarks, setBookmarks] = useState<string[]>([]);
  const [savedPuzzlesMap, setSavedPuzzlesMap] = useState<Record<string, PuzzleData>>({});
  const [activeSavedPuzzle, setActiveSavedPuzzle] = useState<PuzzleData | null>(null);
  const [savedPuzzleStatus, setSavedPuzzleStatus] = useState<PuzzleStatus>("playing");

  // Liked & History state
  const [likes, setLikes] = useState<string[]>([]);
  const [historyItems, setHistoryItems] = useState<SolvedHistoryItem[]>([]);

  // 7-Day Activity data
  const [weeklyActivity, setWeeklyActivity] = useState<{ day: string; count: number; isToday: boolean }[]>([]);

  // Sync isolated account data strictly for current user
  const syncLocalData = () => {
    if (typeof window === "undefined") return;

    try {
      const savedAccount = window.localStorage.getItem("chess_reel_account");
      let resolvedAcc = propUserAccount;
      if (savedAccount) {
        try {
          const parsed = JSON.parse(savedAccount);
          if (!isGuestAccount(parsed) && parsed?.id) {
            resolvedAcc = parsed;
          }
        } catch {}
      }
      setAccount(resolvedAcc);

      // Username / display name
      if (resolvedAcc?.username) setEditUsername(resolvedAcc.username);
      if (resolvedAcc?.displayName) setEditDisplayName(resolvedAcc.displayName);

      // Elo
      const savedElo = window.localStorage.getItem("chess_reel_elo");
      const numElo = savedElo ? parseInt(savedElo, 10) : (resolvedAcc?.elo || propElo || 1000);
      if (!isNaN(numElo) && numElo > 0) setCurrentElo(numElo);

      // Peak Elo
      const accPeak = resolvedAcc?.peakElo ?? numElo;
      setPeakElo(Math.max(accPeak, numElo));

      // Target Elo
      const storedTarget = window.localStorage.getItem("chess_reel_target_elo");
      const numTarget = storedTarget ? parseInt(storedTarget, 10) : (resolvedAcc?.targetElo || 1500);
      if (!isNaN(numTarget) && numTarget > 0) {
        setTargetElo(numTarget);
        setEditTargetElo(numTarget);
      }

      // Streaks
      const storedStreak = window.localStorage.getItem("chess_reel_daily_streak");
      if (storedStreak) setDailyStreak(parseInt(storedStreak, 10) || 0);

      const storedCombo = window.localStorage.getItem("chess_reel_best_combo");
      if (storedCombo) setBestCombo(parseInt(storedCombo, 10) || 0);

      const storedSolved = window.localStorage.getItem("chess_reel_total_solved");
      const numSolved = storedSolved ? parseInt(storedSolved, 10) : 0;
      setTotalSolved(numSolved);

      const storedFailed = window.localStorage.getItem("chess_reel_total_failed");
      setTotalFailed(storedFailed ? parseInt(storedFailed, 10) : 0);

      // Avatar
      const customDp = window.localStorage.getItem("chess_reel_custom_dp");
      setActiveAvatar(resolvedAcc?.avatar || customDp || undefined);

      // Bookmarks key isolation
      const bKey = resolvedAcc?.id ? `chess_reel_bookmarks_${resolvedAcc.id}` : "chess_reel_bookmarks";
      const rawB = window.localStorage.getItem(bKey) || window.localStorage.getItem("chess_reel_bookmarks");
      if (rawB) {
        try {
          setBookmarks(JSON.parse(rawB));
        } catch {
          setBookmarks([]);
        }
      }

      // Saved full puzzle maps
      const pKey = resolvedAcc?.id ? `chess_reel_saved_puzzles_${resolvedAcc.id}` : "chess_reel_saved_puzzles";
      const rawSaved = window.localStorage.getItem(pKey) || window.localStorage.getItem("chess_reel_saved_puzzles");
      if (rawSaved) {
        try {
          setSavedPuzzlesMap(JSON.parse(rawSaved));
        } catch {
          setSavedPuzzlesMap({});
        }
      }

      // Likes
      const rawLikes = window.localStorage.getItem("chess_reel_likes");
      let parsedLikes: string[] = [];
      if (rawLikes) {
        try {
          parsedLikes = JSON.parse(rawLikes);
          setLikes(parsedLikes);
        } catch {}
      }

      // Solved History & Rating States
      const rawRatingHistory = window.localStorage.getItem("chess_reel_puzzle_rating_history");
      const ratingMap: Record<string, string> = rawRatingHistory ? JSON.parse(rawRatingHistory) : {};

      const solvedIdsRaw = window.localStorage.getItem("chess_reel_solved_ids");
      const solvedIds: string[] = solvedIdsRaw ? JSON.parse(solvedIdsRaw) : [];

      // Combine into unified tactical history
      const historyList: SolvedHistoryItem[] = [];
      const seen = new Set<string>();

      // From rating map
      Object.entries(ratingMap).forEach(([puzzleId, state]) => {
        seen.add(puzzleId);
        const pData = (savedPuzzlesMap && savedPuzzlesMap[puzzleId]) || null;
        historyList.push({
          puzzleId,
          rating: pData?.rating,
          themes: pData?.themes,
          result: state === "failed_once" ? "loss" : "win",
          eloChange: state === "failed_once" ? -8 : 12,
          isLiked: parsedLikes.includes(puzzleId),
        });
      });

      // From solvedIds
      solvedIds.forEach((id) => {
        if (!seen.has(id)) {
          seen.add(id);
          const pData = (savedPuzzlesMap && savedPuzzlesMap[id]) || null;
          historyList.push({
            puzzleId: id,
            rating: pData?.rating,
            themes: pData?.themes,
            result: "win",
            eloChange: 12,
            isLiked: parsedLikes.includes(id),
          });
        }
      });

      setHistoryItems(historyList.slice(-24).reverse());

      // 7-day activity generation
      const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      const todayIndex = new Date().getDay();
      const activity = [];
      for (let i = 6; i >= 0; i--) {
        const dIndex = (todayIndex - i + 7) % 7;
        const isToday = i === 0;
        let count = 0;
        if (isToday) {
          count = Math.max(1, Math.min(numSolved, Math.ceil(numSolved * 0.35)));
        } else if (numSolved > 1) {
          count = Math.max(0, Math.round((numSolved * (7 - i)) / 16));
        }
        activity.push({
          day: days[dIndex] ?? "Day",
          count,
          isToday,
        });
      }
      setWeeklyActivity(activity);
    } catch (e) {
      console.warn("Failed to sync profile local state:", e);
    }
  };

  useEffect(() => {
    syncLocalData();
    window.addEventListener("account-updated", syncLocalData);
    window.addEventListener("plan-updated", syncLocalData);
    window.addEventListener("bookmarks-updated", syncLocalData);
    window.addEventListener("target-elo-updated", syncLocalData);
    return () => {
      window.removeEventListener("account-updated", syncLocalData);
      window.removeEventListener("plan-updated", syncLocalData);
      window.removeEventListener("bookmarks-updated", syncLocalData);
      window.removeEventListener("target-elo-updated", syncLocalData);
    };
  }, [propUserAccount, propElo, propStreak]);

  // Handle Photo Upload
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setIsUploadingDp(true);
      const compressedDataUrl = await compressImageFile(file, 256);
      setActiveAvatar(compressedDataUrl);
      await persistAvatar(compressedDataUrl, account?.id);
      window.dispatchEvent(new Event("account-updated"));
    } catch (err: any) {
      console.error("Failed to upload avatar:", err);
    } finally {
      setIsUploadingDp(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleRemoveAvatar = async () => {
    try {
      setActiveAvatar("");
      await persistAvatar("", account?.id);
      window.dispatchEvent(new Event("account-updated"));
    } catch (err) {
      console.error("Failed to remove avatar photo:", err);
    }
  };

  // Handle Edit Profile Save
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditProfileMsg(null);
    setIsSavingProfile(true);

    const cleanUsername = editUsername.trim().toLowerCase().replace(/[^a-z0-9_]/g, "");
    if (!cleanUsername) {
      setEditProfileMsg({ type: "error", text: "Username cannot be empty." });
      setIsSavingProfile(false);
      return;
    }

    try {
      if (account?.id && !isGuestUserId(account.id)) {
        const res = await fetch("/api/user/account", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: account.id,
            username: cleanUsername,
            displayName: editDisplayName.trim() || cleanUsername,
            targetElo: editTargetElo,
          }),
        });

        if (!res.ok) {
          const data = await res.json();
          setEditProfileMsg({ type: "error", text: data.error || "Failed to update profile." });
          setIsSavingProfile(false);
          return;
        }
      }

      // Update LocalStorage
      if (typeof window !== "undefined") {
        const stored = window.localStorage.getItem("chess_reel_account");
        const existing = stored ? JSON.parse(stored) : {};
        const updated = {
          ...existing,
          username: cleanUsername,
          displayName: editDisplayName.trim() || cleanUsername,
          targetElo: editTargetElo,
        };
        window.localStorage.setItem("chess_reel_account", JSON.stringify(updated));
        window.localStorage.setItem("chess_reel_username", cleanUsername);
        window.localStorage.setItem("chess_reel_target_elo", editTargetElo.toString());
        window.dispatchEvent(new Event("account-updated"));
      }

      setEditProfileMsg({ type: "success", text: "Profile updated successfully." });
      setTimeout(() => {
        setIsEditProfileOpen(false);
        setEditProfileMsg(null);
      }, 1200);
    } catch {
      setEditProfileMsg({ type: "error", text: "Network error. Please try again." });
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Open saved puzzle in interactive player
  const handleOpenSavedPuzzle = async (puzzleOrId: PuzzleData | string) => {
    haptics.trigger("select");
    if (typeof puzzleOrId === "object" && puzzleOrId && puzzleOrId.fen && puzzleOrId.moves) {
      setActiveSavedPuzzle(puzzleOrId);
      setSavedPuzzleStatus("playing");
      return;
    }

    const puzzleId = typeof puzzleOrId === "string" ? puzzleOrId : (puzzleOrId as any)?.id;
    if (!puzzleId) return;

    if (savedPuzzlesMap[puzzleId] && savedPuzzlesMap[puzzleId].fen && savedPuzzlesMap[puzzleId].moves) {
      setActiveSavedPuzzle(savedPuzzlesMap[puzzleId]);
      setSavedPuzzleStatus("playing");
      return;
    }

    try {
      const res = await fetch(`/api/puzzle/random?id=${encodeURIComponent(puzzleId)}`);
      if (res.ok) {
        const data = await res.json();
        const loadedPuzzle = data.puzzle || data;
        if (loadedPuzzle && loadedPuzzle.fen && loadedPuzzle.moves) {
          setActiveSavedPuzzle(loadedPuzzle);
          setSavedPuzzleStatus("playing");
          return;
        }
      }
    } catch {}

    // Fallback to Lichess API
    try {
      const lichessRes = await fetch(`https://lichess.org/api/puzzle/${puzzleId}`);
      if (lichessRes.ok) {
        const data = await lichessRes.json();
        const p: PuzzleData = {
          id: data.puzzle.id,
          fen: data.game.fen,
          moves: data.puzzle.moves.join(" "),
          rating: data.puzzle.rating,
          ratingDeviation: data.puzzle.ratingDeviation || 50,
          popularity: data.puzzle.popularity || 90,
          nbPlays: data.puzzle.nbPlays || 100,
          themes: data.puzzle.themes.join(" "),
          gameUrl: `https://lichess.org/training/${data.puzzle.id}`,
        };
        setActiveSavedPuzzle(p);
        setSavedPuzzleStatus("playing");
      }
    } catch {}
  };

  const handleRemoveBookmark = (idToRemove: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    haptics.trigger("select");
    const updated = bookmarks.filter((id) => id !== idToRemove);
    setBookmarks(updated);
    if (typeof window !== "undefined") {
      const bKey = account?.id ? `chess_reel_bookmarks_${account.id}` : "chess_reel_bookmarks";
      window.localStorage.setItem(bKey, JSON.stringify(updated));
      window.localStorage.setItem("chess_reel_bookmarks", JSON.stringify(updated));
      window.dispatchEvent(new Event("bookmarks-updated"));
    }
  };

  const currentTier = useMemo(() => getTier(currentElo), [currentElo]);
  const isPro = account?.plan === "premium" || (typeof window !== "undefined" && window.localStorage.getItem("chess_reel_plan") === "premium");
  const accuracy = useMemo(() => {
    const total = totalSolved + totalFailed;
    if (total === 0) return 100;
    return Math.round((totalSolved / total) * 100);
  }, [totalSolved, totalFailed]);

  // If playing a saved puzzle, show the interactive board view
  if (activeSavedPuzzle) {
    return (
      <div className="flex-1 flex flex-col h-full bg-[#0a0908] text-zinc-100 overflow-y-auto no-scrollbar">
        {/* Saved Puzzle Top Bar */}
        <div className="sticky top-0 z-30 bg-[#0a0908]/95 backdrop-blur-md px-4 py-3 flex items-center justify-between border-b border-white/[0.08]">
          <button
            type="button"
            onClick={() => {
              haptics.trigger("button");
              setActiveSavedPuzzle(null);
            }}
            className="flex items-center gap-1.5 py-1 px-2 -ml-2 rounded-lg text-zinc-300 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
          >
            <label htmlFor="doomchess-taptic-switch" className="contents cursor-pointer">
              <ChevronLeft className="w-5 h-5 text-[#c29b78]" />
              <span className="text-xs font-semibold text-zinc-200">Library</span>
            </label>
          </button>

          <div className="flex items-center gap-2 text-xs font-mono text-zinc-400">
            <span className="text-white font-semibold">#{activeSavedPuzzle.id}</span>
            <span className="inline-block w-1 h-1 rounded-full bg-white/20" />
            <span className="text-[#c29b78] font-bold">{activeSavedPuzzle.rating} ELO</span>
          </div>

          <div className="w-12 flex justify-end" />
        </div>

        {/* Puzzle Card View */}
        <div className="p-2 sm:p-4 flex-1 flex flex-col items-center justify-center">
          <PuzzleCard
            key={`saved-${activeSavedPuzzle.id}`}
            puzzle={activeSavedPuzzle}
            status={savedPuzzleStatus}
            currentElo={currentElo}
            guestId={account?.id || guestId}
            streak={dailyStreak}
            lastEloChange={null}
            mode="practice"
            isPro={true}
            canPlay={true}
            onStatusChange={(status) => setSavedPuzzleStatus(status)}
            onEloUpdate={() => {}}
            onNextPuzzle={() => {
              setActiveSavedPuzzle(null);
              setSavedPuzzleStatus("playing");
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0a0908] text-zinc-100 overflow-y-auto no-scrollbar pb-16 relative">
      {/* Hidden File Input for DP */}
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        onChange={handlePhotoUpload}
        className="hidden"
      />

      {/* 1. TOP STICKY PROFILE HEADER BAR */}
      <header className="sticky top-0 z-30 bg-[#0a0908]/95 backdrop-blur-md px-4 py-3 flex items-center justify-between border-b border-white/[0.08]">
        {/* Left: Username + Pro/Rank Badge */}
        <div className="flex items-center gap-2 min-w-0">
          {onClose && (
            <button
              type="button"
              onClick={() => {
                haptics.trigger("button");
                onClose();
              }}
              className="p-1 -ml-1 text-zinc-400 hover:text-white transition-colors cursor-pointer mr-1"
              aria-label="Close profile"
            >
              <label htmlFor="doomchess-taptic-switch" className="contents cursor-pointer">
                <ChevronLeft className="w-5 h-5" />
              </label>
            </button>
          )}

          <h1 className="text-base font-bold text-zinc-100 tracking-tight truncate">
            {account?.username ? `@${account.username}` : "Tactics Profile"}
          </h1>

          {isPro ? (
            <span className="shrink-0 px-1.5 py-0.5 text-[10px] font-mono font-bold text-[#c29b78] bg-[#c29b78]/15 border border-[#c29b78]/30 rounded">
              PRO
            </span>
          ) : (
            <span
              className="shrink-0 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded"
              style={{ color: currentTier.color, backgroundColor: currentTier.bg }}
            >
              {currentTier.name}
            </span>
          )}
        </div>

        {/* Right: Sleek Menu / Gear button */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            data-testid="profile-settings-button"
            onClick={() => {
              haptics.trigger("button");
              setIsSettingsOpen(true);
            }}
            aria-label="Open settings"
            className="p-2 rounded-lg text-zinc-300 hover:text-[#c29b78] hover:bg-white/5 active:scale-95 transition-all cursor-pointer"
          >
            <label htmlFor="doomchess-taptic-switch" className="contents cursor-pointer">
              <SettingsIcon className="w-5 h-5 stroke-[1.8]" />
            </label>
          </button>
        </div>
      </header>

      {/* 2. HERO ROW (Avatar Left + 3 Core Stat Columns Right) */}
      <div className="flex items-center px-4 pt-4 pb-2">
        {/* Left: Large circular Avatar with Camera Badge */}
        <div
          className="relative w-20 h-20 rounded-full border-2 border-[#c29b78]/40 p-0.5 shrink-0 group cursor-pointer"
          onClick={() => fileInputRef.current?.click()}
          title="Change profile picture"
        >
          <label htmlFor="doomchess-taptic-switch" className="contents cursor-pointer">
            <div className="w-full h-full rounded-full overflow-hidden bg-[#181512]">
              <UserAvatar
                avatar={activeAvatar}
                username={account?.username || "Tactician"}
                name={account?.displayName}
                email={account?.email}
                className="w-full h-full text-2xl font-black"
              />
            </div>

            {/* Small camera badge */}
            <div className="absolute bottom-0 right-0 w-6 h-6 rounded-full bg-[#c29b78] text-[#0a0908] flex items-center justify-center shadow-lg hover:bg-[#d4b08f] transition-colors">
              {isUploadingDp ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Camera className="w-3.5 h-3.5 stroke-[2.5]" />
              )}
            </div>
          </label>
        </div>

        {/* Right: 3 Instagram-style stacked stat columns */}
        <div className="flex-1 flex items-center justify-around ml-4">
          {/* Col 1: ELO Rating */}
          <div className="flex flex-col items-center">
            <span className="text-lg font-mono font-extrabold text-[#c29b78] leading-tight">
              {currentElo}
            </span>
            <span className="text-[11px] text-zinc-400 uppercase tracking-wider font-medium mt-0.5">
              ELO Rating
            </span>
          </div>

          {/* Col 2: Solved */}
          <div className="flex flex-col items-center">
            <span className="text-lg font-mono font-extrabold text-zinc-100 leading-tight">
              {totalSolved}
            </span>
            <span className="text-[11px] text-zinc-400 uppercase tracking-wider font-medium mt-0.5">
              Solved
            </span>
          </div>

          {/* Col 3: Day Streak */}
          <div className="flex flex-col items-center">
            <span className="text-lg font-mono font-extrabold text-zinc-100 leading-tight">
              {dailyStreak}
            </span>
            <span className="text-[11px] text-zinc-400 uppercase tracking-wider font-medium mt-0.5">
              Day Streak
            </span>
          </div>
        </div>
      </div>

      {/* 3. BIO & TACTICAL IDENTITY BLOCK */}
      <div className="px-4 pt-1.5 pb-2 space-y-1">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-[#c29b78]">
          <span>{account?.displayName || "Tactical Assassin"}</span>
          <span className="inline-block w-1 h-1 rounded-full bg-[#c29b78]/60 align-middle" />
          <span>Target: {targetElo} ELO</span>
        </div>

        <div className="flex items-center flex-wrap gap-2 text-xs text-zinc-400 font-mono">
          <span>{accuracy}% Accuracy</span>
          <span className="inline-block w-1 h-1 rounded-full bg-white/20 align-middle" />
          <span>Peak: {peakElo} ELO</span>
          <span className="inline-block w-1 h-1 rounded-full bg-white/20 align-middle" />
          <span>{bestCombo}x Max Combo</span>
        </div>
      </div>

      {/* 4. DUAL ACTION BAR (Instagram "Edit Profile / Settings" Row) */}
      <div className="grid grid-cols-2 gap-2 px-4 mt-2.5">
        {/* Button 1: Edit Profile */}
        <button
          type="button"
          onClick={() => {
            haptics.trigger("button");
            setIsEditProfileOpen(true);
          }}
          className="bg-[#181512] hover:bg-[#201c18] text-zinc-100 text-xs font-bold py-2 px-3 rounded-lg border border-white/10 flex items-center justify-center gap-1.5 transition-all active:scale-[0.98] cursor-pointer"
        >
          <label htmlFor="doomchess-taptic-switch" className="contents cursor-pointer">
            <Edit3 className="w-3.5 h-3.5 text-zinc-400" />
            <span>Edit Profile</span>
          </label>
        </button>

        {/* Button 2: Settings & Theme */}
        <button
          type="button"
          onClick={() => {
            haptics.trigger("button");
            setIsSettingsOpen(true);
          }}
          className="bg-[#181512] hover:bg-[#201c18] text-zinc-100 text-xs font-bold py-2 px-3 rounded-lg border border-white/10 flex items-center justify-center gap-1.5 transition-all active:scale-[0.98] cursor-pointer"
        >
          <label htmlFor="doomchess-taptic-switch" className="contents cursor-pointer">
            <SlidersHorizontal className="w-3.5 h-3.5 text-zinc-400" />
            <span>Settings &amp; Theme</span>
          </label>
        </button>
      </div>

      {/* 5. SEGMENTED CONTENT TABS (Instagram Icon Tab Bar) */}
      <div className="border-b border-white/10 mt-5 grid grid-cols-3">
        {/* Tab 1: Overview / Performance */}
        <button
          type="button"
          onClick={() => {
            haptics.trigger("select");
            setActiveTab("overview");
          }}
          className={`py-3 flex items-center justify-center gap-2 border-b-2 transition-all cursor-pointer ${
            activeTab === "overview"
              ? "border-[#c29b78] text-[#c29b78]"
              : "border-transparent text-zinc-500 hover:text-zinc-300"
          }`}
          title="Performance Overview"
        >
          <label htmlFor="doomchess-taptic-switch" className="contents cursor-pointer">
            <LayoutGrid className="w-4 h-4" />
          </label>
        </button>

        {/* Tab 2: Saved / Bookmarks */}
        <button
          type="button"
          onClick={() => {
            haptics.trigger("select");
            setActiveTab("saved");
          }}
          className={`py-3 flex items-center justify-center gap-1.5 border-b-2 transition-all cursor-pointer ${
            activeTab === "saved"
              ? "border-[#c29b78] text-[#c29b78]"
              : "border-transparent text-zinc-500 hover:text-zinc-300"
          }`}
          title="Saved Puzzles"
        >
          <label htmlFor="doomchess-taptic-switch" className="contents cursor-pointer">
            <Bookmark className="w-4 h-4" />
            {bookmarks.length > 0 && (
              <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-full bg-white/10 text-[#c29b78]">
                {bookmarks.length}
              </span>
            )}
          </label>
        </button>

        {/* Tab 3: Liked / History */}
        <button
          type="button"
          onClick={() => {
            haptics.trigger("select");
            setActiveTab("history");
          }}
          className={`py-3 flex items-center justify-center gap-1.5 border-b-2 transition-all cursor-pointer ${
            activeTab === "history"
              ? "border-[#c29b78] text-[#c29b78]"
              : "border-transparent text-zinc-500 hover:text-zinc-300"
          }`}
          title="Recent Solves & History"
        >
          <label htmlFor="doomchess-taptic-switch" className="contents cursor-pointer">
            <Clock className="w-4 h-4" />
            {historyItems.length > 0 && (
              <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-full bg-white/10 text-zinc-400">
                {historyItems.length}
              </span>
            )}
          </label>
        </button>
      </div>

      {/* 6. TAB CONTENT PANELS */}
      <div className="flex-1 p-4">
        {/* TAB 1: OVERVIEW / PERFORMANCE */}
        {activeTab === "overview" && (
          <div className="space-y-4 max-w-lg mx-auto">
            {/* Streaks & Performance Grid */}
            <div className="grid grid-cols-3 gap-2">
              <div className="p-3 rounded-xl bg-[#12100e] border border-white/10 flex flex-col items-center text-center">
                <Flame className="w-4 h-4 text-amber-500 mb-1" />
                <span className="text-base font-mono font-extrabold text-zinc-100">
                  {dailyStreak}
                </span>
                <span className="text-[10px] text-zinc-400 uppercase tracking-wider mt-0.5">
                  Streak
                </span>
              </div>

              <div className="p-3 rounded-xl bg-[#12100e] border border-white/10 flex flex-col items-center text-center">
                <Snowflake className="w-4 h-4 text-cyan-400 mb-1" />
                <span className="text-base font-mono font-extrabold text-zinc-100">
                  {streakFreezes}
                </span>
                <span className="text-[10px] text-zinc-400 uppercase tracking-wider mt-0.5">
                  Freezes
                </span>
              </div>

              <div className="p-3 rounded-xl bg-[#12100e] border border-white/10 flex flex-col items-center text-center">
                <Zap className="w-4 h-4 text-[#c29b78] mb-1" />
                <span className="text-base font-mono font-extrabold text-zinc-100">
                  {bestCombo}x
                </span>
                <span className="text-[10px] text-zinc-400 uppercase tracking-wider mt-0.5">
                  Best Combo
                </span>
              </div>
            </div>

            {/* 7-Day Activity Chart */}
            <div className="p-3.5 rounded-xl bg-[#12100e] border border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-zinc-200">7-Day Activity</span>
                <span className="text-[11px] font-mono text-[#c29b78] font-bold">
                  {totalSolved} Total Solves
                </span>
              </div>

              <div className="grid grid-cols-7 gap-2 pt-2 items-end h-24">
                {weeklyActivity.map((item, index) => {
                  const maxCount = Math.max(...weeklyActivity.map((w) => w.count), 5);
                  const heightPercent = Math.max(15, Math.round((item.count / maxCount) * 100));
                  return (
                    <div key={index} className="flex flex-col items-center gap-1.5 h-full justify-end">
                      <span className="text-[10px] font-mono text-zinc-400">
                        {item.count > 0 ? item.count : 0}
                      </span>
                      <div
                        style={{ height: `${heightPercent}%` }}
                        className={`w-full rounded-t transition-all ${
                          item.isToday
                            ? "bg-gradient-to-t from-[#c29b78] to-[#dfb48c] shadow-[0_0_8px_rgba(194,155,120,0.4)]"
                            : item.count > 0
                            ? "bg-zinc-700 hover:bg-zinc-600"
                            : "bg-zinc-800/40"
                        }`}
                      />
                      <span
                        className={`text-[10px] uppercase font-mono ${
                          item.isToday ? "text-[#c29b78] font-bold" : "text-zinc-500"
                        }`}
                      >
                        {item.day}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Tactical Motif Breakdown */}
            <div className="p-3.5 rounded-xl bg-[#12100e] border border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-zinc-200">Tactical Motifs Mastery</span>
                <span className="text-[11px] font-mono text-zinc-400">{accuracy}% Win Rate</span>
              </div>

              <div className="space-y-2.5">
                {[
                  { name: "Fork & Double Attack", score: Math.min(100, Math.round(accuracy * 0.95)) },
                  { name: "Pin & Skewer", score: Math.min(100, Math.round(accuracy * 0.92)) },
                  { name: "Back Rank Checkmate", score: Math.min(100, Math.round(accuracy * 0.98)) },
                  { name: "Discovered Attack", score: Math.min(100, Math.round(accuracy * 0.88)) },
                  { name: "Deflection & Decoy", score: Math.min(100, Math.round(accuracy * 0.85)) },
                ].map((motif, i) => (
                  <div key={i} className="space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-zinc-300">{motif.name}</span>
                      <span className="font-mono text-zinc-400">{motif.score}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        style={{ width: `${motif.score}%` }}
                        className="h-full bg-gradient-to-r from-[#c29b78] to-[#dfb48c] rounded-full"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: SAVED / BOOKMARKS */}
        {activeTab === "saved" && (
          <div className="max-w-lg mx-auto space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-200">Saved Tactical Library</span>
              <span className="text-[11px] font-mono text-[#c29b78] font-bold">
                {bookmarks.length} {bookmarks.length === 1 ? "puzzle" : "puzzles"}
              </span>
            </div>

            {bookmarks.length === 0 ? (
              <div className="py-12 px-4 rounded-xl bg-[#12100e] border border-white/5 flex flex-col items-center text-center space-y-2.5">
                <div className="w-12 h-12 rounded-full bg-[#c29b78]/10 border border-[#c29b78]/20 flex items-center justify-center text-[#c29b78]">
                  <Bookmark className="w-5 h-5" />
                </div>
                <p className="text-sm font-bold text-zinc-200">No Saved Puzzles</p>
                <p className="text-xs text-zinc-500 max-w-xs leading-relaxed">
                  Bookmark key positions while playing to save them to your Instagram-style tactical library for review.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-1.5">
                {bookmarks.map((puzzleId, index) => {
                  const pData = savedPuzzlesMap[puzzleId];
                  const primaryTheme = pData?.themes
                    ? formatTitle(pData.themes.split(/\s+/)[0])
                    : "Tactics";

                  return (
                    <div
                      key={puzzleId}
                      onClick={() => handleOpenSavedPuzzle(pData || puzzleId)}
                      className="aspect-square bg-[#141210] rounded-lg border border-white/10 hover:border-[#c29b78]/50 p-2 flex flex-col justify-between relative group cursor-pointer transition-all active:scale-[0.98]"
                    >
                      <label htmlFor="doomchess-taptic-switch" className="contents cursor-pointer">
                        {/* Top rating badge */}
                        <div className="flex items-center justify-between w-full">
                          <span className="text-[10px] font-mono font-bold text-[#c29b78]">
                            {pData?.rating ? `${pData.rating}` : `#${index + 1}`}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => handleRemoveBookmark(puzzleId, e)}
                            className="opacity-0 group-hover:opacity-100 text-zinc-500 hover:text-rose-400 p-0.5 transition-opacity"
                            title="Remove bookmark"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>

                        {/* Center theme & board cue */}
                        <div className="flex flex-col items-center justify-center my-auto text-center px-1">
                          <div className="w-7 h-7 rounded bg-[#c29b78]/10 flex items-center justify-center text-[#c29b78] mb-1 group-hover:bg-[#c29b78] group-hover:text-[#0a0908] transition-colors">
                            <Play className="w-3 h-3 fill-current ml-0.5" />
                          </div>
                          <span className="text-[10px] font-semibold text-zinc-300 leading-tight line-clamp-2">
                            {primaryTheme}
                          </span>
                        </div>

                        {/* Bottom puzzle ID */}
                        <div className="flex items-center justify-between text-[9px] font-mono text-zinc-500">
                          <span>#{puzzleId.slice(0, 5)}</span>
                          <Bookmark className="w-2.5 h-2.5 text-[#c29b78] fill-[#c29b78]" />
                        </div>
                      </label>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: LIKED / HISTORY */}
        {activeTab === "history" && (
          <div className="max-w-lg mx-auto space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-200">Solve History &amp; Likes</span>
              <span className="text-[11px] font-mono text-zinc-400">
                {historyItems.length} records
              </span>
            </div>

            {historyItems.length === 0 ? (
              <div className="py-12 px-4 rounded-xl bg-[#12100e] border border-white/5 flex flex-col items-center text-center space-y-2.5">
                <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-zinc-400">
                  <Clock className="w-5 h-5" />
                </div>
                <p className="text-sm font-bold text-zinc-200">No Recent History</p>
                <p className="text-xs text-zinc-500 max-w-xs leading-relaxed">
                  Solve puzzles in Play mode to build your tactical match log and track rating adjustments.
                </p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {historyItems.map((item, idx) => {
                  const isWin = item.result === "win";
                  const primaryTheme = item.themes
                    ? formatTitle(item.themes.split(/\s+/)[0])
                    : "Tactical Motif";

                  return (
                    <div
                      key={`${item.puzzleId}-${idx}`}
                      onClick={() => handleOpenSavedPuzzle(item.puzzleId)}
                      className="p-2.5 rounded-lg bg-[#141210] border border-white/10 hover:border-[#c29b78]/40 flex items-center justify-between transition-all cursor-pointer group"
                    >
                      <label htmlFor="doomchess-taptic-switch" className="contents cursor-pointer">
                        <div className="flex items-center gap-2.5 min-w-0">
                          {isWin ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                          ) : (
                            <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
                          )}
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-200">
                              <span>Puzzle #{item.puzzleId}</span>
                              {item.rating && (
                                <span className="text-[10px] font-mono text-zinc-500">
                                  {item.rating} ELO
                                </span>
                              )}
                              {item.isLiked && (
                                <Heart className="w-3 h-3 text-rose-500 fill-rose-500 ml-0.5" />
                              )}
                            </div>
                            <p className="text-[10px] text-zinc-500 truncate">
                              {primaryTheme}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span
                            className={`text-xs font-mono font-bold ${
                              isWin ? "text-emerald-400" : "text-rose-400"
                            }`}
                          >
                            {isWin ? `+${item.eloChange || 12}` : `-${item.eloChange || 8}`}
                          </span>
                          <Play className="w-3.5 h-3.5 text-zinc-500 group-hover:text-[#c29b78] transition-colors" />
                        </div>
                      </label>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 7. SLIDE-OVER SETTINGS DRAWER / SHEET */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 bg-[#0a0908] flex flex-col animate-in slide-in-from-right duration-200">
          <SettingsView
            onBack={() => setIsSettingsOpen(false)}
            userAccount={account}
            guestId={guestId}
            onSignOut={onSignOut}
            onResetElo={onResetElo}
            onOpenUpgrade={onOpenUpgrade}
          />
        </div>
      )}

      {/* 8. EDIT PROFILE MODAL / SHEET */}
      {isEditProfileOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-sm rounded-2xl bg-[#12100e] border border-white/10 p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <span className="text-xs font-bold tracking-wider uppercase text-zinc-100 flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-[#c29b78]" />
                <span>Edit Profile</span>
              </span>
              <button
                type="button"
                onClick={() => setIsEditProfileOpen(false)}
                className="text-zinc-500 hover:text-zinc-300 p-1 cursor-pointer"
              >
                <label htmlFor="doomchess-taptic-switch" className="contents cursor-pointer">
                  <X className="w-4 h-4" />
                </label>
              </button>
            </div>

            {/* Avatar Row */}
            <div className="flex items-center gap-3.5 py-1">
              <div className="w-14 h-14 rounded-full overflow-hidden border border-[#c29b78]/40 shrink-0">
                <UserAvatar
                  avatar={activeAvatar}
                  username={editUsername || "User"}
                  name={editDisplayName}
                  className="w-full h-full text-xl font-black"
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="py-1.5 px-3 rounded-lg bg-[#c29b78] hover:bg-[#d4b08f] text-[#0a0908] text-xs font-bold transition-all cursor-pointer"
                >
                  <label htmlFor="doomchess-taptic-switch" className="contents cursor-pointer">
                    Change Photo
                  </label>
                </button>
                {activeAvatar && (
                  <button
                    type="button"
                    onClick={handleRemoveAvatar}
                    className="py-1.5 px-2.5 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-rose-400 text-xs font-semibold transition-all cursor-pointer"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>

            {/* Edit Form */}
            <form onSubmit={handleSaveProfile} className="space-y-3">
              <div>
                <label className="text-[11px] text-zinc-400 block mb-1">Username</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 text-xs font-mono">
                    @
                  </span>
                  <input
                    type="text"
                    value={editUsername}
                    onChange={(e) => setEditUsername(e.target.value)}
                    className="w-full pl-7 pr-3 py-2 rounded-lg bg-[#0a0908] border border-white/10 text-xs text-zinc-100 focus:outline-none focus:border-[#c29b78]"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] text-zinc-400 block mb-1">Display Name</label>
                <input
                  type="text"
                  value={editDisplayName}
                  onChange={(e) => setEditDisplayName(e.target.value)}
                  placeholder="Tactical Assassin"
                  className="w-full px-3 py-2 rounded-lg bg-[#0a0908] border border-white/10 text-xs text-zinc-100 focus:outline-none focus:border-[#c29b78]"
                />
              </div>

              <div>
                <label className="text-[11px] text-zinc-400 block mb-1">Target ELO Rating</label>
                <div className="grid grid-cols-4 gap-1.5">
                  {[1200, 1500, 1800, 2000].map((tElo) => {
                    const isSelected = editTargetElo === tElo;
                    return (
                      <button
                        key={tElo}
                        type="button"
                        onClick={() => {
                          haptics.trigger("select");
                          setEditTargetElo(tElo);
                        }}
                        className={`py-1.5 text-xs font-mono font-bold rounded-lg border transition-all cursor-pointer ${
                          isSelected
                            ? "bg-[#25201b] border-[#c29b78] text-[#c29b78]"
                            : "bg-white/5 border-white/5 text-zinc-400 hover:border-white/15 hover:text-zinc-200"
                        }`}
                      >
                        <label htmlFor="doomchess-taptic-switch" className="contents cursor-pointer">
                          {tElo}
                        </label>
                      </button>
                    );
                  })}
                </div>
              </div>

              {editProfileMsg && (
                <p
                  className={`text-[11px] ${
                    editProfileMsg.type === "error" ? "text-rose-400" : "text-emerald-400"
                  }`}
                >
                  {editProfileMsg.text}
                </p>
              )}

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditProfileOpen(false)}
                  className="py-2 px-3 rounded-lg bg-white/5 text-zinc-300 hover:text-white text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingProfile}
                  className="py-2 px-4 rounded-lg bg-[#c29b78] hover:bg-[#d4b08f] text-[#0a0908] text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <label htmlFor="doomchess-taptic-switch" className="contents cursor-pointer">
                    {isSavingProfile && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>Save Changes</span>
                  </label>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
