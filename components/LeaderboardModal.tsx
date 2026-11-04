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
  Check,
  Clock,
  Inbox,
  Send,
} from "lucide-react";
import { UserAvatar } from "@/components/UserAvatar";

export interface FriendEntry {
  id: string;
  username: string;
  displayName?: string | null;
  avatar?: string | null;
  elo: number;
  streak: number;
  peakElo?: number;
  skillTier?: string | null;
  plan?: string | null;
}

export interface FriendRequestItem {
  id: string;
  senderId: string;
  receiverId: string;
  status: string;
  createdAt: string;
  sender?: {
    id: string;
    username: string | null;
    displayName: string | null;
    avatar: string | null;
    elo: number;
    streak: number;
    peakElo: number;
    skillTier: string | null;
    plan: string | null;
  };
  receiver?: {
    id: string;
    username: string | null;
    displayName: string | null;
    avatar: string | null;
    elo: number;
    streak: number;
    peakElo: number;
    skillTier: string | null;
    plan: string | null;
  };
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
  onIncomingRequestsCountChange?: (count: number) => void;
}

interface LeaderboardEntry {
  rank: number;
  name: string;
  elo: number;
  tier: string;
}

export function getTier(elo: number): {
  name: string;
  color: string;
  bg: string;
  nextTier?: { name: string; threshold: number };
} {
  if (elo >= 2400)
    return { name: "Grandmaster", color: "#c29b78", bg: "rgba(194, 155, 120, 0.15)" };
  if (elo >= 2000)
    return {
      name: "Master",
      color: "#dfb48c",
      bg: "rgba(223, 180, 140, 0.15)",
      nextTier: { name: "Grandmaster", threshold: 2400 },
    };
  if (elo >= 1600)
    return {
      name: "Diamond",
      color: "#94a3b8",
      bg: "rgba(148, 163, 184, 0.15)",
      nextTier: { name: "Master", threshold: 2000 },
    };
  if (elo >= 1400)
    return {
      name: "Platinum",
      color: "#a8a29e",
      bg: "rgba(168, 162, 158, 0.15)",
      nextTier: { name: "Diamond", threshold: 1600 },
    };
  if (elo >= 1200)
    return {
      name: "Gold",
      color: "#c29b78",
      bg: "rgba(194, 155, 120, 0.15)",
      nextTier: { name: "Platinum", threshold: 1400 },
    };
  if (elo >= 1000)
    return {
      name: "Silver",
      color: "#78716c",
      bg: "rgba(120, 113, 108, 0.15)",
      nextTier: { name: "Gold", threshold: 1200 },
    };
  return {
    name: "Bronze",
    color: "#78716c",
    bg: "rgba(120, 113, 108, 0.15)",
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
  onIncomingRequestsCountChange,
}: LeaderboardModalProps) {
  const [tab, setTab] = useState<"global" | "friends" | "requests">("global");
  const [friends, setFriends] = useState<FriendEntry[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<FriendRequestItem[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<FriendRequestItem[]>([]);
  const [friendInput, setFriendInput] = useState<string>("");
  const [friendError, setFriendError] = useState<string | null>(null);
  const [friendSuccess, setFriendSuccess] = useState<string | null>(null);
  const [isSendingRequest, setIsSendingRequest] = useState<boolean>(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const effectiveUserId = userAccount?.id || guestId;

  // Load friends and pending requests from API
  const loadFriendsAndRequests = useCallback(async () => {
    if (!effectiveUserId) return;
    try {
      const res = await fetch(`/api/friends?userId=${encodeURIComponent(effectiveUserId)}`);
      if (res.ok) {
        const data = await res.json();
        const loadedFriends: FriendEntry[] = data.friends || [];
        const loadedIncoming: FriendRequestItem[] = data.incomingRequests || [];
        const loadedOutgoing: FriendRequestItem[] = data.outgoingRequests || [];

        setFriends(loadedFriends);
        setIncomingRequests(loadedIncoming);
        setOutgoingRequests(loadedOutgoing);

        const count = loadedIncoming.length;
        if (onIncomingRequestsCountChange) {
          onIncomingRequestsCountChange(count);
        }
      }
    } catch (e) {
      console.warn("Could not load friends data:", e);
    }
  }, [effectiveUserId, onIncomingRequestsCountChange]);

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        loadFriendsAndRequests();
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [isOpen, loadFriendsAndRequests]);

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
    { rank: 1, name: "Magnus Carlsen", elo: 2882, tier: "Grandmaster" },
    { rank: 2, name: "Hikaru Nakamura", elo: 2875, tier: "Grandmaster" },
    { rank: 3, name: "Alireza Firouzja", elo: 2805, tier: "Grandmaster" },
    { rank: 4, name: "Fabiano Caruana", elo: 2803, tier: "Grandmaster" },
    { rank: 5, name: "Gukesh D", elo: 2794, tier: "Grandmaster" },
    { rank: 6, name: "Arjun Erigaisi", elo: 2791, tier: "Grandmaster" },
    { rank: 7, name: "Nodirbek Abdusattorov", elo: 2783, tier: "Grandmaster" },
  ];

  const userRank = Math.max(
    8,
    Math.round(500000 / (1 + Math.exp((currentElo - 1200) / 250)))
  );

  // Handle Send Friend Request
  const handleSendFriendRequest = async () => {
    const uname = friendInput.trim().toLowerCase().replace(/^@/, "");
    if (!uname) return;

    setFriendError(null);
    setFriendSuccess(null);
    setIsSendingRequest(true);

    try {
      const res = await fetch("/api/friends", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: effectiveUserId,
          targetUsername: uname,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setFriendError(data.error || "Could not send friend request.");
        setIsSendingRequest(false);
        return;
      }

      setFriendSuccess(data.message || `Request sent to @${uname}`);
      setFriendInput("");
      await loadFriendsAndRequests();
    } catch {
      setFriendError("Network error sending friend request.");
    } finally {
      setIsSendingRequest(false);
    }
  };

  // Handle Accept or Decline Incoming Request
  const handleRespondToRequest = async (requestId: string, action: "accept" | "decline") => {
    setActionLoadingId(requestId);
    setFriendError(null);
    setFriendSuccess(null);

    try {
      const res = await fetch("/api/friends", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId,
          userId: effectiveUserId,
          action,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setFriendError(data.error || `Could not ${action} request.`);
      } else {
        setFriendSuccess(data.message || (action === "accept" ? "Friend request accepted." : "Friend request declined."));
        await loadFriendsAndRequests();
      }
    } catch {
      setFriendError(`Network error while trying to ${action} request.`);
    } finally {
      setActionLoadingId(null);
    }
  };

  // Handle Cancel Outgoing Request
  const handleCancelOutgoingRequest = async (requestId: string) => {
    try {
      const res = await fetch("/api/friends", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: effectiveUserId,
          requestId,
        }),
      });
      if (res.ok) {
        setOutgoingRequests((prev) => prev.filter((r) => r.id !== requestId));
      }
    } catch (e) {
      console.warn("Error cancelling request:", e);
    }
  };

  // Handle Remove Established Friend
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

  // Combined sorted list for Friends Leaderboard
  const currentUserFriendEntry = {
    id: effectiveUserId,
    username: userAccount?.username || "You",
    displayName: userAccount?.displayName || (userAccount ? userAccount.username : "You"),
    avatar: userAccount?.avatar || "♟",
    elo: currentElo,
    streak: streak,
    isSelf: true,
  };

  const combinedFriendsList = [
    currentUserFriendEntry,
    ...friends.map((f) => ({ ...f, isSelf: false })),
  ].sort((a, b) => b.elo - a.elo);

  return (
    <div
      data-testid="leaderboard-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div
        data-testid="leaderboard-modal"
        className="bg-[#12100e] border border-white/[0.08] rounded-2xl p-5 max-w-[420px] w-full text-[#f5f2eb] max-h-[90vh] flex flex-col shadow-2xl relative animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="leaderboard-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-white/[0.06]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#c29b78]/10 border border-[#c29b78]/20 flex items-center justify-center text-[#c29b78]">
              <Trophy className="w-4 h-4" strokeWidth={1.5} />
            </div>
            <div>
              <h2 id="leaderboard-title" className="text-sm font-semibold text-[#f5f2eb] tracking-tight">
                {tab === "global"
                  ? "Global Standings"
                  : tab === "friends"
                  ? "Friends Ranking"
                  : "Friend Requests"}
              </h2>
              <p className="text-[11px] text-[#78716c]">Tactical Reel Leaderboard</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close leaderboard"
            className="w-7 h-7 rounded-lg flex items-center justify-center text-[#78716c] hover:text-[#f5f2eb] hover:bg-white/[0.04] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" strokeWidth={1.5} />
          </button>
        </div>

        {/* 3-Way Segmented Tabs (Global Standings | Friends | Requests) */}
        <div className="my-3.5">
          <div className="grid grid-cols-3 p-1 rounded-xl bg-[#0a0908] border border-white/[0.06]">
            <button
              data-testid="tab-global"
              onClick={() => {
                setTab("global");
                setFriendError(null);
                setFriendSuccess(null);
              }}
              className={`py-1.5 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                tab === "global"
                  ? "bg-[#1b1816] text-[#f5f2eb] border border-[#c29b78]/30 shadow-sm"
                  : "text-[#78716c] hover:text-[#f5f2eb]"
              }`}
            >
              <Globe className="w-3 h-3" />
              <span>Global</span>
            </button>
            <button
              data-testid="tab-friends"
              onClick={() => {
                setTab("friends");
                setFriendError(null);
                setFriendSuccess(null);
              }}
              className={`py-1.5 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                tab === "friends"
                  ? "bg-[#1b1816] text-[#f5f2eb] border border-[#c29b78]/30 shadow-sm"
                  : "text-[#78716c] hover:text-[#f5f2eb]"
              }`}
            >
              <Users className="w-3 h-3" />
              <span>Friends ({friends.length})</span>
            </button>
            <button
              data-testid="tab-requests"
              onClick={() => {
                setTab("requests");
                setFriendError(null);
                setFriendSuccess(null);
              }}
              className={`py-1.5 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1.5 cursor-pointer relative ${
                tab === "requests"
                  ? "bg-[#1b1816] text-[#f5f2eb] border border-[#c29b78]/30 shadow-sm"
                  : "text-[#78716c] hover:text-[#f5f2eb]"
              }`}
            >
              <Inbox className="w-3 h-3" />
              <span>Requests</span>
              {incomingRequests.length > 0 && (
                <span
                  data-testid="requests-tab-badge"
                  className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-[#c29b78] text-[#0a0908] ml-0.5 leading-tight"
                >
                  {incomingRequests.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto space-y-3.5 pr-0.5">
          {tab === "global" && (
            <>
              {/* User Position Card */}
              <div className="p-3.5 rounded-xl bg-[#0a0908] border border-white/[0.06] relative overflow-hidden">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-[#1b1816] border border-white/[0.08] flex items-center justify-center text-sm overflow-hidden shrink-0">
                      <UserAvatar avatar={userAccount?.avatar} fallback="♟" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-semibold text-[#f5f2eb]">
                          {userAccount ? userAccount.displayName || userAccount.username : "You"}
                        </span>
                        <span className="text-[10px] text-[#78716c] font-mono">
                          {userAccount ? `@${userAccount.username}` : `#${guestId.slice(0, 6)}`}
                        </span>
                      </div>
                      <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-white/[0.04] text-[#c29b78] border border-white/[0.06] font-medium inline-block mt-0.5">
                        {currentTier.name} Division
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-base font-bold text-[#f5f2eb] tabular-nums tracking-tight flex items-center justify-end gap-1">
                      <Zap className="w-3.5 h-3.5 text-[#c29b78] fill-[#c29b78]" />
                      <span>{currentElo}</span>
                      <span className="text-[10px] text-[#78716c] font-normal">Elo</span>
                    </div>
                    <div className="flex items-center justify-end gap-1 text-[10px] text-[#c29b78] font-medium mt-0.5">
                      <Flame className="w-3 h-3 fill-[#c29b78]" />
                      <span>{streak}d streak</span>
                    </div>
                  </div>
                </div>

                {/* Next Tier Progress Bar */}
                {currentTier.nextTier && (
                  <div className="pt-2 border-t border-white/[0.04] space-y-1.5">
                    <div className="flex items-center justify-between text-[10px] text-[#78716c]">
                      <span>Division Progress</span>
                      <span>
                        <span className="text-[#c29b78] font-medium">{pointsToNext} Elo</span> to {currentTier.nextTier.name}
                      </span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-[#1b1816] overflow-hidden">
                      <div
                        className="h-full rounded-full bg-[#c29b78] transition-all duration-500"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Top Tacticians List */}
              <div>
                <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-[#78716c] mb-2 px-1 font-medium">
                  <span>Top Tacticians</span>
                  <span>Rating</span>
                </div>

                <div className="space-y-1">
                  {leaders.map((entry) => (
                    <div
                      key={entry.rank}
                      className="flex items-center justify-between px-3 py-2 rounded-xl bg-[#0a0908]/50 border border-white/[0.04] hover:border-white/[0.08] transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="w-5 text-center text-xs tabular-nums font-medium text-[#78716c]">
                          #{entry.rank}
                        </span>
                        <div className="w-7 h-7 rounded-full flex items-center justify-center font-medium text-xs bg-[#1b1816] text-[#f5f2eb] border border-white/[0.06]">
                          {entry.name[0]}
                        </div>
                        <div>
                          <span className="text-xs font-medium text-[#f5f2eb] block leading-tight">
                            {entry.name}
                          </span>
                          <span className="text-[10px] text-[#78716c]">
                            {entry.tier}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 font-semibold text-xs text-[#f5f2eb] tabular-nums">
                        <Zap className="w-3 h-3 text-[#c29b78] fill-[#c29b78]" />
                        <span>{entry.elo}</span>
                      </div>
                    </div>
                  ))}

                  {/* Current User Row */}
                  <div
                    data-testid="global-user-row"
                    className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-[#c29b78]/[0.06] border border-[#c29b78]/25 shadow-sm mt-2"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="w-5 text-center text-xs tabular-nums font-bold text-[#c29b78]">
                        #{userRank}
                      </span>
                      <div className="w-7 h-7 rounded-full bg-[#1b1816] border border-[#c29b78]/30 flex items-center justify-center font-bold text-xs overflow-hidden shrink-0">
                        <UserAvatar avatar={userAccount?.avatar} fallback="♟" />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-semibold text-[#f5f2eb] block leading-tight">
                            {userAccount ? userAccount.displayName || userAccount.username : "Your Position"}
                          </span>
                          <span className="bg-[#c29b78]/20 text-[#c29b78] text-[9px] px-1 py-0.2 rounded font-bold uppercase">
                            YOU
                          </span>
                        </div>
                        <span className="text-[10px] text-[#c29b78]/80 font-medium">
                          {currentTier.name}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 font-bold text-xs text-[#f5f2eb] tabular-nums">
                      <Zap className="w-3 h-3 text-[#c29b78] fill-[#c29b78]" />
                      <span>{currentElo}</span>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {tab === "friends" && (
            <>
              {/* Send Friend Request Input Box */}
              <div className="p-3.5 rounded-xl bg-[#0a0908] border border-white/[0.06] space-y-2.5">
                <label className="text-[10px] font-medium uppercase tracking-[0.15em] text-[#78716c] flex items-center gap-1.5">
                  <UserPlus className="w-3.5 h-3.5 text-[#c29b78]" strokeWidth={1.5} />
                  <span>Send Friend Request</span>
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      data-testid="add-friend-input"
                      type="text"
                      placeholder="Enter username (e.g. magnus)"
                      value={friendInput}
                      onChange={(e) => setFriendInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleSendFriendRequest();
                        }
                      }}
                      className="w-full px-3 py-2 text-xs rounded-xl bg-[#12100e] border border-white/[0.08] text-[#f5f2eb] placeholder:text-[#78716c] focus:outline-none focus:border-[#c29b78]/60 transition-colors"
                    />
                  </div>
                  <button
                    data-testid="add-friend-submit-btn"
                    onClick={handleSendFriendRequest}
                    disabled={isSendingRequest || !friendInput.trim()}
                    className="px-3.5 py-2 rounded-xl bg-[#c29b78] hover:bg-[#d4af8c] active:scale-[0.99] disabled:opacity-50 text-[#0a0908] font-semibold text-xs tracking-wide transition-all cursor-pointer shrink-0 flex items-center gap-1"
                  >
                    <Send className="w-3 h-3" />
                    <span>{isSendingRequest ? "Sending..." : "Send Request"}</span>
                  </button>
                </div>

                {/* Instant Feedback Messages */}
                {friendError && (
                  <p data-testid="friend-error-msg" className="text-xs font-medium text-rose-400">
                    {friendError}
                  </p>
                )}
                {friendSuccess && (
                  <p data-testid="friend-success-msg" className="text-xs font-medium text-[#c29b78]">
                    {friendSuccess}
                  </p>
                )}
              </div>

              {/* Guest Reminder if not signed in */}
              {!userAccount && (
                <div className="p-3 rounded-xl bg-[#c29b78]/[0.08] border border-[#c29b78]/20 flex items-center justify-between gap-2">
                  <div className="text-[11px] text-[#c29b78]">
                    Sign in to save your friends and receive challenge requests.
                  </div>
                  {onOpenAuth && (
                    <button
                      onClick={() => {
                        onClose();
                        onOpenAuth();
                      }}
                      className="px-2.5 py-1 rounded-lg bg-[#c29b78] text-[#0a0908] font-semibold text-[10px] uppercase tracking-wider shrink-0 cursor-pointer"
                    >
                      Sign In
                    </button>
                  )}
                </div>
              )}

              {/* Outgoing Pending Requests (if any) */}
              {outgoingRequests.length > 0 && (
                <div className="p-3 rounded-xl bg-[#0a0908]/70 border border-white/[0.04] space-y-2">
                  <div className="flex items-center justify-between text-[10px] font-medium uppercase tracking-wider text-[#78716c]">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-[#c29b78]" />
                      <span>Outgoing Pending ({outgoingRequests.length})</span>
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    {outgoingRequests.map((req) => (
                      <div
                        key={req.id}
                        data-testid="outgoing-request-row"
                        className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-white/[0.02] border border-white/[0.04] text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-[#1b1816] flex items-center justify-center text-xs overflow-hidden">
                            <UserAvatar avatar={req.receiver?.avatar} fallback="♟" />
                          </div>
                          <span className="text-[#f5f2eb] font-medium">
                            @{req.receiver?.username || "player"}
                          </span>
                          <span className="text-[10px] text-[#78716c]">
                            • Waiting for response
                          </span>
                        </div>
                        <button
                          onClick={() => handleCancelOutgoingRequest(req.id)}
                          className="text-[10px] text-[#78716c] hover:text-rose-400 transition-colors"
                          title="Cancel request"
                        >
                          Cancel
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Friends Leaderboard Standings */}
              <div>
                <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-[#78716c] mb-2 px-1 font-medium">
                  <span>Friends Leaderboard</span>
                  <span>Rating</span>
                </div>

                <div className="space-y-1">
                  {combinedFriendsList.map((entry, index) => {
                    const rankNum = index + 1;
                    const tier = getTier(entry.elo);

                    return (
                      <div
                        key={entry.id}
                        data-testid={entry.isSelf ? "friends-user-row" : "friend-row"}
                        className={`flex items-center justify-between px-3 py-2.5 rounded-xl border transition-colors ${
                          entry.isSelf
                            ? "bg-[#c29b78]/[0.06] border-[#c29b78]/25 shadow-sm"
                            : "bg-[#0a0908]/50 border-white/[0.04] hover:border-white/[0.08]"
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <span
                            className={`w-5 text-center text-xs tabular-nums font-medium ${
                              entry.isSelf ? "text-[#c29b78] font-bold" : "text-[#78716c]"
                            }`}
                          >
                            #{rankNum}
                          </span>

                          <div className="w-7 h-7 rounded-full bg-[#1b1816] border border-white/[0.08] flex items-center justify-center text-xs overflow-hidden shrink-0">
                            <UserAvatar avatar={entry.avatar} fallback="♟" />
                          </div>

                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-semibold text-[#f5f2eb]">
                                {entry.displayName || entry.username}
                              </span>
                              {entry.isSelf && (
                                <span className="bg-[#c29b78]/20 text-[#c29b78] text-[9px] px-1.5 py-0.2 rounded font-bold uppercase">
                                  YOU
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="text-[9px] uppercase px-1 py-0.2 rounded bg-white/[0.04] text-[#78716c] font-medium">
                                {tier.name}
                              </span>
                              {entry.streak > 0 && (
                                <span className="text-[10px] text-[#c29b78] font-medium flex items-center gap-0.5">
                                  <Flame className="w-2.5 h-2.5 fill-[#c29b78]" />
                                  {entry.streak}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1 font-semibold text-xs text-[#f5f2eb] tabular-nums">
                            <Zap className="w-3 h-3 text-[#c29b78] fill-[#c29b78]" />
                            <span>{entry.elo}</span>
                          </div>

                          {!entry.isSelf && (
                            <button
                              onClick={() => handleRemoveFriend(entry.id)}
                              title="Remove friend"
                              className="p-1 rounded text-[#78716c] hover:text-rose-400 transition-colors cursor-pointer"
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

          {tab === "requests" && (
            <div className="space-y-3">
              <div className="text-[10px] uppercase tracking-wider text-[#78716c] px-1 font-medium flex items-center justify-between">
                <span>Incoming Friend Requests</span>
                <span>{incomingRequests.length} Pending</span>
              </div>

              {/* Feedback Message */}
              {friendError && (
                <p data-testid="request-error-msg" className="text-xs font-medium text-rose-400 px-1">
                  {friendError}
                </p>
              )}
              {friendSuccess && (
                <p data-testid="request-success-msg" className="text-xs font-medium text-[#c29b78] px-1">
                  {friendSuccess}
                </p>
              )}

              {incomingRequests.length === 0 ? (
                <div
                  data-testid="no-incoming-requests"
                  className="py-10 text-center rounded-xl bg-[#0a0908]/50 border border-white/[0.04] p-6 space-y-1.5"
                >
                  <Inbox className="w-7 h-7 text-[#78716c]/60 mx-auto stroke-[1.5]" />
                  <p className="text-xs text-[#f5f2eb] font-medium">No pending requests</p>
                  <p className="text-[11px] text-[#78716c]">
                    When other tacticians challenge or add you, their invitations will appear here.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {incomingRequests.map((req) => {
                    const sender = req.sender;
                    const tier = getTier(sender?.elo || 800);
                    const isLoading = actionLoadingId === req.id;

                    return (
                      <div
                        key={req.id}
                        data-testid="incoming-request-card"
                        className="p-3 rounded-xl bg-[#0a0908] border border-white/[0.06] flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-9 h-9 rounded-full bg-[#1b1816] border border-white/[0.08] flex items-center justify-center text-xs overflow-hidden shrink-0">
                            <UserAvatar avatar={sender?.avatar} fallback="♟" />
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-semibold text-[#f5f2eb] truncate">
                              {sender?.displayName || sender?.username || "Tactician"}
                            </div>
                            <div className="flex items-center gap-2 text-[10px] text-[#78716c]">
                              <span>@{sender?.username || "user"}</span>
                              <span>•</span>
                              <span className="flex items-center gap-0.5 text-[#f5f2eb] font-medium">
                                <Zap className="w-2.5 h-2.5 text-[#c29b78] fill-[#c29b78]" />
                                {sender?.elo || 800} Elo
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Accept / Decline Action Buttons */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            data-testid="accept-friend-btn"
                            disabled={isLoading}
                            onClick={() => handleRespondToRequest(req.id, "accept")}
                            className="w-8 h-8 rounded-lg bg-[#c29b78]/15 hover:bg-[#c29b78]/25 border border-[#c29b78]/30 flex items-center justify-center text-[#c29b78] transition-all cursor-pointer disabled:opacity-50"
                            title="Accept request"
                          >
                            <Check className="w-4 h-4 stroke-[2.5]" />
                          </button>
                          <button
                            data-testid="decline-friend-btn"
                            disabled={isLoading}
                            onClick={() => handleRespondToRequest(req.id, "decline")}
                            className="w-8 h-8 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] flex items-center justify-center text-[#78716c] hover:text-[#f5f2eb] transition-all cursor-pointer disabled:opacity-50"
                            title="Decline request"
                          >
                            <X className="w-4 h-4 stroke-[2]" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 mt-3 border-t border-white/[0.06] flex justify-end">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-[#f5f2eb] text-xs font-medium transition-all cursor-pointer text-center"
          >
            Back to Reels
          </button>
        </div>
      </div>
    </div>
  );
}
