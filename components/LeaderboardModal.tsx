"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Trophy,
  Flame,
  Zap,
  X,
  Users,
  Globe,
  UserPlus,
  Trash2,
} from "lucide-react";

export interface FriendEntry {
  id: string;
  username: string;
  displayName?: string | null;
  avatar?: string | null;
  elo: number;
  streak: number;
  peakElo?: number;
}

interface LeaderboardModalProps {
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
  } | null;
  onOpenAuth?: () => void;
}

interface LeaderboardEntry {
  rank: number;
  name: string;
  elo: number;
  tier: string;
  avatarBg: string;
}

export function getTier(elo: number): {
  name: string;
  color: string;
  bg: string;
  nextTier?: { name: string; threshold: number };
} {
  if (elo >= 2400)
    return { name: "Grandmaster", color: "#f59e0b", bg: "rgba(245, 158, 11, 0.15)" };
  if (elo >= 2000)
    return {
      name: "Master",
      color: "#ec4899",
      bg: "rgba(236, 72, 153, 0.15)",
      nextTier: { name: "Grandmaster", threshold: 2400 },
    };
  if (elo >= 1600)
    return {
      name: "Diamond",
      color: "#38bdf8",
      bg: "rgba(56, 189, 248, 0.15)",
      nextTier: { name: "Master", threshold: 2000 },
    };
  if (elo >= 1400)
    return {
      name: "Platinum",
      color: "#a855f7",
      bg: "rgba(168, 85, 247, 0.15)",
      nextTier: { name: "Diamond", threshold: 1600 },
    };
  if (elo >= 1200)
    return {
      name: "Gold",
      color: "#eab308",
      bg: "rgba(234, 179, 8, 0.15)",
      nextTier: { name: "Platinum", threshold: 1400 },
    };
  if (elo >= 1000)
    return {
      name: "Silver",
      color: "#94a3b8",
      bg: "rgba(148, 163, 184, 0.15)",
      nextTier: { name: "Gold", threshold: 1200 },
    };
  return {
    name: "Bronze",
    color: "#b45309",
    bg: "rgba(180, 83, 9, 0.15)",
    nextTier: { name: "Silver", threshold: 1000 },
  };
}

export function LeaderboardModal({
  isOpen,
  onClose,
  currentElo,
  streak,
  guestId,
  userAccount,
  onOpenAuth,
}: LeaderboardModalProps) {
  const [tab, setTab] = useState<"global" | "friends">("global");
  const [friends, setFriends] = useState<FriendEntry[]>([]);
  const [friendInput, setFriendInput] = useState<string>("");
  const [friendError, setFriendError] = useState<string | null>(null);
  const [friendSuccess, setFriendSuccess] = useState<string | null>(null);
  const [isAddingFriend, setIsAddingFriend] = useState<boolean>(false);

  const effectiveUserId = userAccount?.id || guestId;

  // Load friends from API
  const loadFriends = useCallback(async () => {
    if (!effectiveUserId) return;
    try {
      const res = await fetch(`/api/friends?userId=${encodeURIComponent(effectiveUserId)}`);
      if (res.ok) {
        const data = await res.json();
        setFriends(data.friends || []);
      }
    } catch (e) {
      console.warn("Could not load friends:", e);
    }
  }, [effectiveUserId]);

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        loadFriends();
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [isOpen, loadFriends]);

  if (!isOpen) return null;

  const currentTier = getTier(currentElo);

  // Compute tier progress percentage
  let progressPercent = 100;
  let pointsToNext = 0;
  if (currentTier.nextTier) {
    const currentBase =
      currentElo >= 1000 ? Math.floor(currentElo / 200) * 200 : 800;
    const range = currentTier.nextTier.threshold - currentBase;
    const progress = currentElo - currentBase;
    progressPercent = Math.min(
      100,
      Math.max(0, Math.round((progress / range) * 100))
    );
    pointsToNext = currentTier.nextTier.threshold - currentElo;
  }

  // Curated global tacticians
  const leaders: LeaderboardEntry[] = [
    { rank: 1, name: "Magnus Carlsen", elo: 2882, tier: "Grandmaster", avatarBg: "bg-amber-500/20 text-amber-300" },
    { rank: 2, name: "Hikaru Nakamura", elo: 2875, tier: "Grandmaster", avatarBg: "bg-amber-500/20 text-amber-300" },
    { rank: 3, name: "Alireza Firouzja", elo: 2805, tier: "Grandmaster", avatarBg: "bg-amber-500/20 text-amber-300" },
    { rank: 4, name: "Fabiano Caruana", elo: 2803, tier: "Grandmaster", avatarBg: "bg-amber-500/20 text-amber-300" },
    { rank: 5, name: "Gukesh D", elo: 2794, tier: "Grandmaster", avatarBg: "bg-pink-500/20 text-pink-300" },
    { rank: 6, name: "Arjun Erigaisi", elo: 2791, tier: "Grandmaster", avatarBg: "bg-pink-500/20 text-pink-300" },
    { rank: 7, name: "Nodirbek Abdusattorov", elo: 2783, tier: "Grandmaster", avatarBg: "bg-sky-500/20 text-sky-300" },
  ];

  const userRank = Math.max(
    8,
    Math.round(500000 / (1 + Math.exp((currentElo - 1200) / 250)))
  );

  // Handle Add Friend
  const handleAddFriend = async (targetUsername?: string) => {
    const uname = (targetUsername || friendInput).trim().toLowerCase();
    if (!uname) return;

    setFriendError(null);
    setFriendSuccess(null);
    setIsAddingFriend(true);

    try {
      const res = await fetch("/api/friends", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: effectiveUserId,
          friendUsername: uname,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setFriendError(data.error || "Could not add friend.");
        setIsAddingFriend(false);
        return;
      }

      setFriendSuccess(`Added ${data.friend.displayName || data.friend.username} to your friends!`);
      setFriendInput("");
      loadFriends();
    } catch {
      setFriendError("Network error adding friend.");
    } finally {
      setIsAddingFriend(false);
    }
  };

  // Handle Remove Friend
  const handleRemoveFriend = async (friendId: string) => {
    try {
      const res = await fetch("/api/friends", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: effectiveUserId,
          friendId,
        }),
      });
      if (res.ok) {
        setFriends((prev) => prev.filter((f) => f.id !== friendId));
      }
    } catch (e) {
      console.warn("Error removing friend:", e);
    }
  };

  // Build sorted combined list for Friends Rank
  const currentUserFriendEntry = {
    id: effectiveUserId,
    username: userAccount?.username || "You",
    displayName: userAccount?.displayName || (userAccount ? userAccount.username : "You"),
    avatar: userAccount?.avatar || "♟",
    elo: currentElo,
    streak: streak,
    isSelf: true,
  };

  const combinedFriendsList = [currentUserFriendEntry, ...friends.map((f) => ({ ...f, isSelf: false }))].sort(
    (a, b) => b.elo - a.elo
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="w-full max-w-md max-h-[90vh] flex flex-col rounded-2xl bg-[#121214] border border-[#27272a] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="leaderboard-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#27272a] bg-[#18181B]/80 backdrop-blur-sm">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Trophy className="w-4 h-4" />
            </div>
            <div>
              <h2 id="leaderboard-title" className="text-base font-bold text-[#e5e1e4] tracking-tight">
                {tab === "global" ? "Global Standings" : "Friends Ranking"}
              </h2>
              <p className="text-[11px] text-[#bbcabf] font-medium">Tactical Reel Leaderboard</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close leaderboard"
            className="w-8 h-8 rounded-full flex items-center justify-center text-[#bbcabf] hover:text-white bg-[#201f21] hover:bg-[#2a2a2c] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Global vs Friends Segmented Toggle */}
        <div className="p-3 bg-[#18181B]/50 border-b border-[#27272a]">
          <div className="grid grid-cols-2 p-1 rounded-xl bg-[#201f21]">
            <button
              onClick={() => setTab("global")}
              className={`py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                tab === "global"
                  ? "bg-[#4edea3] text-[#002113] shadow-md"
                  : "text-[#bbcabf] hover:text-white"
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>Global Standings</span>
            </button>
            <button
              onClick={() => setTab("friends")}
              className={`py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                tab === "friends"
                  ? "bg-[#4edea3] text-[#002113] shadow-md"
                  : "text-[#bbcabf] hover:text-white"
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Friends Rank ({friends.length})</span>
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {tab === "global" ? (
            <>
              {/* User Status Card */}
              <div className="p-4 rounded-xl bg-gradient-to-br from-[#18181B] to-[#201f21] border border-[#4edea3]/30 shadow-lg relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-[#4edea3]/5 rounded-full blur-2xl pointer-events-none" />

                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-full bg-[#4edea3]/10 border border-[#4edea3]/30 flex items-center justify-center text-[#4edea3] font-black text-sm">
                      {userAccount?.avatar || "⚡"}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-bold text-white">
                          {userAccount ? userAccount.displayName || userAccount.username : "You"}
                        </span>
                        <span className="text-[10px] text-[#bbcabf] font-mono">
                          {userAccount ? `@${userAccount.username}` : `#${guestId.slice(0, 6)}`}
                        </span>
                      </div>
                      <span
                        className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
                        style={{ color: currentTier.color, backgroundColor: currentTier.bg }}
                      >
                        {currentTier.name}
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-lg font-black text-[#4edea3] tracking-tight">
                      {currentElo} <span className="text-xs text-[#bbcabf] font-normal">Elo</span>
                    </div>
                    <div className="flex items-center justify-end gap-1 text-[11px] font-bold text-[#ffb95f]">
                      <Flame className="w-3 h-3 fill-[#ffb95f]" />
                      <span>{streak} Streak</span>
                    </div>
                  </div>
                </div>

                {/* Next Tier Progress Bar */}
                {currentTier.nextTier && (
                  <div className="mt-2 pt-2 border-t border-white/5 space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] font-semibold text-[#bbcabf]">
                      <span>Tier Progress</span>
                      <span>
                        <span className="text-[#4edea3] font-bold">{pointsToNext} Elo</span> to {currentTier.nextTier.name}
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-[#2a2a2c] overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-[#10b981] to-[#4edea3] transition-all duration-500 shadow-[0_0_8px_rgba(78,222,163,0.5)]"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Top Rankings List */}
              <div>
                <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-[#bbcabf] mb-2 px-1">
                  <span>Top Tacticians</span>
                  <span>Rating</span>
                </div>

                <div className="space-y-1.5">
                  {leaders.map((entry) => (
                    <div
                      key={entry.rank}
                      className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-[#18181B]/70 border border-white/[0.04] hover:border-white/10 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={`w-6 text-center text-xs font-black ${
                            entry.rank === 1
                              ? "text-amber-400"
                              : entry.rank === 2
                              ? "text-neutral-300"
                              : entry.rank === 3
                              ? "text-amber-600"
                              : "text-neutral-500"
                          }`}
                        >
                          {entry.rank === 1 ? "🥇" : entry.rank === 2 ? "🥈" : entry.rank === 3 ? "🥉" : entry.rank}
                        </span>
                        <div className="w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs bg-[#2a2a2c] text-white">
                          {entry.name[0]}
                        </div>
                        <div>
                          <span className="text-xs font-bold text-[#e5e1e4] block leading-tight">
                            {entry.name}
                          </span>
                          <span className="text-[10px] text-[#bbcabf] font-medium">
                            {entry.tier}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 font-bold text-xs text-[#4edea3]">
                        <Zap className="w-3 h-3 fill-[#4edea3]" />
                        <span>{entry.elo}</span>
                      </div>
                    </div>
                  ))}

                  {/* User Pinned Rank */}
                  <div className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-[#4edea3]/10 border border-[#4edea3]/40 shadow-sm mt-2">
                    <div className="flex items-center gap-3">
                      <span className="w-6 text-center text-xs font-black text-[#4edea3]">
                        #{userRank}
                      </span>
                      <div className="w-7 h-7 rounded-full bg-[#10b981] text-[#002113] flex items-center justify-center font-black text-xs">
                        {userAccount?.avatar || "You"}
                      </div>
                      <div>
                        <span className="text-xs font-black text-white block leading-tight">
                          {userAccount ? userAccount.displayName || userAccount.username : "Your Position"}
                        </span>
                        <span className="text-[10px] text-[#4edea3] font-bold">
                          {currentTier.name}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 font-bold text-xs text-[#4edea3]">
                      <Zap className="w-3 h-3 fill-[#4edea3]" />
                      <span>{currentElo}</span>
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Friends Tab Content */}

              {/* Add Friend Input Box */}
              <div className="p-3 rounded-xl bg-[#18181B] border border-white/10 space-y-2">
                <label className="text-[11px] font-bold uppercase tracking-wider text-[#bbcabf] flex items-center gap-1.5">
                  <UserPlus className="w-3.5 h-3.5 text-[#4edea3]" />
                  <span>Add Friend by Username</span>
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      placeholder="e.g. hikaru_fan"
                      value={friendInput}
                      onChange={(e) => setFriendInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddFriend();
                        }
                      }}
                      className="w-full px-3 py-2 text-xs rounded-lg bg-[#201f21] border border-white/5 text-white placeholder:text-neutral-600 focus:outline-none focus:border-[#4edea3]"
                    />
                  </div>
                  <button
                    onClick={() => handleAddFriend()}
                    disabled={isAddingFriend || !friendInput.trim()}
                    className="px-3.5 py-2 rounded-lg bg-[#4edea3] hover:bg-[#10b981] disabled:opacity-50 text-[#002113] font-bold text-xs transition-colors cursor-pointer shrink-0"
                  >
                    {isAddingFriend ? "Adding..." : "+ Add"}
                  </button>
                </div>

                {/* Instant Feedback Messages */}
                {friendError && (
                  <p className="text-[11px] font-medium text-red-400">{friendError}</p>
                )}
                {friendSuccess && (
                  <p className="text-[11px] font-medium text-[#4edea3]">{friendSuccess}</p>
                )}

                {/* Suggested Demo Friends to Add with 1-click */}
                <div className="pt-1">
                  <span className="text-[10px] text-[#bbcabf] block mb-1.5 font-medium">
                    Try adding tactical challengers:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {["tactics_pro", "hikaru_fan", "magnus_junior", "chess_rookie"].map((name) => {
                      const alreadyFriend = friends.some((f) => f.username === name);
                      if (alreadyFriend) return null;
                      return (
                        <button
                          key={name}
                          onClick={() => handleAddFriend(name)}
                          className="px-2 py-1 rounded-md bg-[#201f21] hover:bg-[#2a2a2c] text-[10px] font-mono text-[#bbcabf] hover:text-[#4edea3] border border-white/5 transition-colors cursor-pointer"
                        >
                          +{name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Guest Reminder if not signed in */}
              {!userAccount && (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between gap-2">
                  <div className="text-[11px] text-amber-200">
                    You are in Guest mode. Create an account to permanently save your friends and rank!
                  </div>
                  {onOpenAuth && (
                    <button
                      onClick={() => {
                        onClose();
                        onOpenAuth();
                      }}
                      className="px-2.5 py-1.5 rounded-lg bg-amber-500 text-black font-bold text-[10px] uppercase tracking-wider shrink-0 cursor-pointer"
                    >
                      Sign In
                    </button>
                  )}
                </div>
              )}

              {/* Friends Leaderboard Standings */}
              <div>
                <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-[#bbcabf] mb-2 px-1">
                  <span>Friends Leaderboard</span>
                  <span>Rating</span>
                </div>

                <div className="space-y-1.5">
                  {combinedFriendsList.map((entry, index) => {
                    const rankNum = index + 1;
                    const tier = getTier(entry.elo);

                    return (
                      <div
                        key={entry.id}
                        className={`flex items-center justify-between px-3 py-2.5 rounded-xl border transition-colors ${
                          entry.isSelf
                            ? "bg-[#4edea3]/10 border-[#4edea3]/40 shadow-sm"
                            : "bg-[#18181B]/80 border-white/5 hover:border-white/10"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className={`w-6 text-center text-xs font-black ${
                              rankNum === 1
                                ? "text-amber-400"
                                : rankNum === 2
                                ? "text-neutral-300"
                                : rankNum === 3
                                ? "text-amber-600"
                                : "text-neutral-500"
                            }`}
                          >
                            {rankNum === 1 ? "🥇" : rankNum === 2 ? "🥈" : rankNum === 3 ? "🥉" : `#${rankNum}`}
                          </span>

                          <div className="w-8 h-8 rounded-full bg-[#201f21] border border-white/10 flex items-center justify-center text-sm">
                            {entry.avatar || "♟"}
                          </div>

                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-bold text-white">
                                {entry.displayName || entry.username}
                              </span>
                              {entry.isSelf && (
                                <span className="bg-[#4edea3]/20 text-[#4edea3] text-[9px] px-1.5 py-0.2 rounded font-black uppercase">
                                  You
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span
                                className="text-[9px] font-bold uppercase px-1 py-0.2 rounded"
                                style={{ color: tier.color, backgroundColor: tier.bg }}
                              >
                                {tier.name}
                              </span>
                              {entry.streak > 0 && (
                                <span className="text-[10px] text-[#ffb95f] font-bold flex items-center gap-0.5">
                                  <Flame className="w-2.5 h-2.5 fill-[#ffb95f]" />
                                  {entry.streak}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1 font-bold text-xs text-[#4edea3]">
                            <Zap className="w-3 h-3 fill-[#4edea3]" />
                            <span>{entry.elo}</span>
                          </div>

                          {!entry.isSelf && (
                            <button
                              onClick={() => handleRemoveFriend(entry.id)}
                              title="Remove friend"
                              className="p-1 rounded text-[#bbcabf]/50 hover:text-red-400 transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-[#27272a] bg-[#18181B]/60 flex justify-end">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-[#4edea3] hover:bg-[#10b981] text-[#002113] font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer shadow-md"
          >
            Back to Reels
          </button>
        </div>
      </div>
    </div>
  );
}
