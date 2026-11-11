"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Settings as SettingsIcon,
  Palette,
  User,
  Volume2,
  VolumeX,
  Vibrate,
  Sparkles,
  Zap,
  Check,
  RotateCcw,
  LogOut,
  AlertCircle,
  Loader2,
  ShieldCheck,
  Crown,
  Headphones,
  ExternalLink,
} from "lucide-react";
import { BOARD_THEMES, BoardTheme, useBoardTheme } from "@/lib/boardThemes";
import { sounds } from "@/lib/audio";
import { UserAvatar } from "@/components/UserAvatar";
import { isGuestUserId } from "@/lib/guestAccount";
import { SUPPORT_EMAIL, SUPPORT_MAILTO } from "@/lib/support";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  userAccount?: {
    id: string;
    username: string;
    displayName?: string;
    avatar?: string;
    plan?: string;
    elo?: number;
  } | null;
  guestId?: string;
  onSignOut?: () => void;
}

export function SettingsModal({
  isOpen,
  onClose,
  userAccount,
  guestId = "guest",
  onSignOut,
}: SettingsModalProps) {
  const [boardTheme, setBoardTheme] = useBoardTheme();

  // Username form state
  const currentUsername = userAccount?.username || (typeof window !== "undefined" ? window.localStorage.getItem("chess_reel_username") || "tactician" : "tactician");
  const [usernameInput, setUsernameInput] = useState<string>(currentUsername);
  const [displayNameInput, setDisplayNameInput] = useState<string>(userAccount?.displayName || "");
  const [isSavingUser, setIsSavingUser] = useState<boolean>(false);
  const [userSaveSuccess, setUserSaveSuccess] = useState<boolean>(false);
  const [userError, setUserError] = useState<string | null>(null);

  // Audio & Haptic state
  const [isSfxEnabled, setIsSfxEnabled] = useState<boolean>(true);
  const [isHapticsEnabled, setIsHapticsEnabled] = useState<boolean>(true);

  // Gameplay state
  const [autoAdvance, setAutoAdvance] = useState<boolean>(false);
  const [showCoordinates, setShowCoordinates] = useState<boolean>(true);
  const [animSpeed, setAnimSpeed] = useState<"snappy" | "smooth" | "instant">("snappy");

  // Sync state on open
  useEffect(() => {
    if (!isOpen || typeof window === "undefined") return;

    // SFX
    setIsSfxEnabled(!sounds.getIsMuted());

    // Haptics
    const haptics = window.localStorage.getItem("chess_reel_haptics");
    setIsHapticsEnabled(haptics !== "0");

    // Auto advance (defaults to false)
    const auto = window.localStorage.getItem("chess_reel_auto_advance");
    setAutoAdvance(auto === "1" || auto === "true");

    // Board coordinates / markings
    const coords = window.localStorage.getItem("chess_reel_show_coordinates");
    setShowCoordinates(coords !== "0");

    // Anim speed
    const speed = window.localStorage.getItem("chess_reel_anim_speed");
    if (speed === "smooth" || speed === "instant" || speed === "snappy") {
      setAnimSpeed(speed);
    }

    const handleAutoAdvanceEvent = () => {
      const currentVal = window.localStorage.getItem("chess_reel_auto_advance");
      setAutoAdvance(currentVal === "1" || currentVal === "true");
    };
    window.addEventListener("auto-advance-updated", handleAutoAdvanceEvent);

    // Username
    const savedAcc = window.localStorage.getItem("chess_reel_account");
    if (savedAcc) {
      try {
        const parsed = JSON.parse(savedAcc);
        if (parsed?.username) setUsernameInput(parsed.username);
        if (parsed?.displayName) setDisplayNameInput(parsed.displayName);
      } catch {}
    } else if (userAccount?.username) {
      setUsernameInput(userAccount.username);
      setDisplayNameInput(userAccount.displayName || "");
    }

    return () => window.removeEventListener("auto-advance-updated", handleAutoAdvanceEvent);
  }, [isOpen, userAccount]);

  if (!isOpen) return null;

  // Toggle sound
  const handleToggleSound = () => {
    const nextState = !isSfxEnabled;
    setIsSfxEnabled(nextState);
    sounds.setIsMuted(!nextState);
    if (nextState) {
      // Play a quick satisfying move sound so the user can verify
      try {
        sounds.playMove();
      } catch {}
    }
    if (userAccount?.id && !isGuestUserId(userAccount.id)) {
      fetch("/api/user/account", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: userAccount.id, soundEnabled: nextState }),
      }).catch(() => {});
    }
  };

  // Toggle haptics
  const handleToggleHaptics = () => {
    const nextState = !isHapticsEnabled;
    setIsHapticsEnabled(nextState);
    if (typeof window !== "undefined") {
      window.localStorage.setItem("chess_reel_haptics", nextState ? "1" : "0");
      if (nextState && typeof navigator !== "undefined" && navigator.vibrate) {
        navigator.vibrate(25);
      }
    }
  };

  // Toggle auto advance
  const handleToggleAutoAdvance = () => {
    const next = !autoAdvance;
    setAutoAdvance(next);
    if (typeof window !== "undefined") {
      window.localStorage.setItem("chess_reel_auto_advance", next ? "1" : "0");
      window.dispatchEvent(new Event("auto-advance-updated"));
    }
    if (userAccount?.id && !isGuestUserId(userAccount.id)) {
      fetch("/api/user/account", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: userAccount.id, autoAdvance: next }),
      }).catch(() => {});
    }
  };

  // Toggle board markings / coordinates
  const handleToggleCoordinates = () => {
    const nextState = !showCoordinates;
    setShowCoordinates(nextState);
    if (typeof window !== "undefined") {
      window.localStorage.setItem("chess_reel_show_coordinates", nextState ? "1" : "0");
      window.dispatchEvent(
        new CustomEvent("board-coordinates-updated", { detail: { show: nextState } })
      );
    }
    if (userAccount?.id && !isGuestUserId(userAccount.id)) {
      fetch("/api/user/account", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: userAccount.id, showCoordinates: nextState }),
      }).catch(() => {});
    }
  };

  // Change animation speed
  const handleSelectAnimSpeed = (speed: "snappy" | "smooth" | "instant") => {
    setAnimSpeed(speed);
    if (typeof window !== "undefined") {
      window.localStorage.setItem("chess_reel_anim_speed", speed);
    }
  };

  // Save username & display name
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setUserError(null);
    setUserSaveSuccess(false);

    const cleanUser = usernameInput.trim().toLowerCase();
    if (!/^[a-z0-9_]{3,20}$/.test(cleanUser)) {
      setUserError("Username must be 3-20 characters (letters, numbers, underscores).");
      return;
    }

    setIsSavingUser(true);

    try {
      const activeUserId = userAccount?.id;
      if (activeUserId) {
        // Send PATCH to backend
        const res = await fetch("/api/user/account", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: activeUserId,
            username: cleanUser,
            displayName: displayNameInput.trim() || cleanUser,
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          setUserError(data.error || "Failed to update username.");
          setIsSavingUser(false);
          return;
        }

        // Update local storage
        if (typeof window !== "undefined") {
          const stored = window.localStorage.getItem("chess_reel_account");
          const existing = stored ? JSON.parse(stored) : {};
          const merged = { ...existing, ...data.user };
          window.localStorage.setItem("chess_reel_account", JSON.stringify(merged));
          window.dispatchEvent(new Event("account-updated"));
        }
      } else {
        // Guest user update in localStorage
        if (typeof window !== "undefined") {
          const stored = window.localStorage.getItem("chess_reel_account");
          const existing = stored ? JSON.parse(stored) : {};
          const updated = {
            ...existing,
            username: cleanUser,
            displayName: displayNameInput.trim() || cleanUser,
          };
          window.localStorage.setItem("chess_reel_account", JSON.stringify(updated));
          window.localStorage.setItem("chess_reel_username", cleanUser);
          window.dispatchEvent(new Event("account-updated"));
        }
      }

      setUserSaveSuccess(true);
      setTimeout(() => setUserSaveSuccess(false), 2500);
    } catch {
      setUserError("Network error. Please try again.");
    } finally {
      setIsSavingUser(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="w-full max-w-md max-h-[90vh] flex flex-col rounded-3xl bg-[#0f0e0d] border border-white/[0.1] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 text-[#f5f2eb]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-modal-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.08] bg-[#141210]/90 backdrop-blur-md shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#c29b78]/15 border border-[#c29b78]/30 flex items-center justify-center text-[#c29b78]">
              <SettingsIcon className="w-4 h-4" />
            </div>
            <div>
              <h2 id="settings-modal-title" className="text-base font-semibold tracking-tight text-[#f5f2eb]">
                Settings
              </h2>
              <p className="text-[11px] text-[#a8a29e]">Appearance, profile & experience</p>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Close settings"
            className="w-8 h-8 rounded-full flex items-center justify-center text-[#a8a29e] hover:text-[#f5f2eb] bg-white/[0.04] hover:bg-white/[0.08] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Settings Sections */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* ======================================================== */}
          {/* 1. CHESSBOARD THEMES (2x3 Grid, Clean swatches)          */}
          {/* ======================================================== */}
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <Palette className="w-4 h-4 text-[#c29b78]" />
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[#c29b78]">
                Chessboard Theme
              </h3>
            </div>
            <p className="text-xs text-[#a8a29e] mb-3">
              Applied instantly to your tactical puzzles.
            </p>

            <div className="grid grid-cols-2 gap-2.5">
              {BOARD_THEMES.map((theme) => {
                const isSelected = boardTheme.id === theme.id;
                return (
                  <button
                    key={theme.id}
                    onClick={() => setBoardTheme(theme.id)}
                    type="button"
                    className={`relative p-2.5 rounded-2xl border transition-all duration-150 flex flex-col items-center gap-2 cursor-pointer ${
                      isSelected
                        ? "bg-[#c29b78]/[0.12] border-[#c29b78] shadow-lg shadow-[#c29b78]/15 ring-1 ring-[#c29b78]"
                        : "bg-[#141210] border-white/[0.08] hover:border-white/20 hover:bg-[#1a1714]"
                    }`}
                  >
                    {/* Selected Badge */}
                    {isSelected && (
                      <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-[#c29b78] text-[#0a0908] flex items-center justify-center shadow-md">
                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                      </div>
                    )}

                    {/* 4x4 Mini Checkerboard Swatch (Clean, no pieces) */}
                    <div className="w-16 h-16 rounded-xl overflow-hidden grid grid-cols-4 grid-rows-4 border border-black/40 shadow-inner shrink-0">
                      {[...Array(16)].map((_, idx) => {
                        const r = Math.floor(idx / 4);
                        const c = idx % 4;
                        const isDark = (r + c) % 2 === 1;
                        return (
                          <div
                            key={idx}
                            className="w-full h-full"
                            style={{
                              backgroundColor: isDark ? theme.dark : theme.light,
                            }}
                          />
                        );
                      })}
                    </div>

                    {/* Board Name */}
                    <span
                      className={`text-xs font-medium text-center transition-colors ${
                        isSelected ? "text-[#f5f2eb]" : "text-[#a8a29e]"
                      }`}
                    >
                      {theme.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="h-px bg-white/[0.06]" />

          {/* ======================================================== */}
          {/* 2. PROFILE & USERNAME                                    */}
          {/* ======================================================== */}
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <User className="w-4 h-4 text-[#c29b78]" />
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[#c29b78]">
                Identity & Username
              </h3>
            </div>
            <p className="text-xs text-[#a8a29e] mb-3">
              Change your username and handle on leaderboards.
            </p>

            <form onSubmit={handleSaveProfile} className="space-y-3">
              <div>
                <label className="block text-[11px] font-mono text-[#a8a29e] mb-1">
                  USERNAME
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-mono text-[#78716c]">
                    @
                  </span>
                  <input
                    type="text"
                    value={usernameInput}
                    onChange={(e) => {
                      setUsernameInput(e.target.value);
                      setUserError(null);
                    }}
                    placeholder="tactician"
                    maxLength={20}
                    className="w-full h-10 pl-7 pr-3 rounded-xl bg-[#141210] border border-white/[0.08] focus:border-[#c29b78] focus:ring-1 focus:ring-[#c29b78] text-xs font-mono text-[#f5f2eb] outline-none transition-all placeholder:text-[#57534e]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-mono text-[#a8a29e] mb-1">
                  DISPLAY NAME (OPTIONAL)
                </label>
                <input
                  type="text"
                  value={displayNameInput}
                  onChange={(e) => setDisplayNameInput(e.target.value)}
                  placeholder="Master Tactician"
                  maxLength={30}
                  className="w-full h-10 px-3 rounded-xl bg-[#141210] border border-white/[0.08] focus:border-[#c29b78] focus:ring-1 focus:ring-[#c29b78] text-xs text-[#f5f2eb] outline-none transition-all placeholder:text-[#57534e]"
                />
              </div>

              {userError && (
                <div className="flex items-center gap-2 text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 px-3 py-2 rounded-xl">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{userError}</span>
                </div>
              )}

              {userSaveSuccess && (
                <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-2 rounded-xl">
                  <Check className="w-4 h-4 shrink-0" />
                  <span>Profile updated successfully!</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isSavingUser || !usernameInput.trim()}
                className="w-full h-10 rounded-xl bg-[#c29b78] hover:bg-[#d4b08f] text-[#0a0908] font-semibold text-xs tracking-wide transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-[#c29b78]/15"
              >
                {isSavingUser ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <span>Save Profile</span>
                )}
              </button>
            </form>
          </div>

          <div className="h-px bg-white/[0.06]" />

          {/* ======================================================== */}
          {/* 3. AUDIO & HAPTICS                                       */}
          {/* ======================================================== */}
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <Volume2 className="w-4 h-4 text-[#c29b78]" />
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[#c29b78]">
                Sound & Feedback
              </h3>
            </div>

            <div className="space-y-2 mt-3">
              {/* Sound Effects Switch */}
              <div className="flex items-center justify-between p-3 rounded-2xl bg-[#141210] border border-white/[0.08]">
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg bg-white/[0.04] flex items-center justify-center text-[#c29b78]">
                    {isSfxEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 text-[#78716c]" />}
                  </div>
                  <div>
                    <span className="text-xs font-medium text-[#f5f2eb] block">Sound Effects</span>
                    <span className="text-[10px] text-[#78716c]">Piece clicks, captures, checkmates</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleToggleSound}
                  className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                    isSfxEnabled ? "bg-[#c29b78]" : "bg-white/[0.1]"
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full bg-[#0a0908] transition-transform duration-200 absolute top-1 left-1 ${
                      isSfxEnabled ? "translate-x-5 bg-[#0a0908]" : "translate-x-0 bg-white"
                    }`}
                  />
                </button>
              </div>

              {/* Haptic Vibration Switch */}
              <div className="flex items-center justify-between p-3 rounded-2xl bg-[#141210] border border-white/[0.08]">
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg bg-white/[0.04] flex items-center justify-center text-[#c29b78]">
                    <Vibrate className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-medium text-[#f5f2eb] block">Haptic Feedback</span>
                    <span className="text-[10px] text-[#78716c]">Vibration on moves and mistakes</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleToggleHaptics}
                  className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                    isHapticsEnabled ? "bg-[#c29b78]" : "bg-white/[0.1]"
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full bg-[#0a0908] transition-transform duration-200 absolute top-1 left-1 ${
                      isHapticsEnabled ? "translate-x-5 bg-[#0a0908]" : "translate-x-0 bg-white"
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          <div className="h-px bg-white/[0.06]" />

          {/* ======================================================== */}
          {/* 4. PUZZLE GAMEPLAY PREFERENCES                           */}
          {/* ======================================================== */}
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <Sparkles className="w-4 h-4 text-[#c29b78]" />
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[#c29b78]">
                Puzzle Experience
              </h3>
            </div>

            <div className="space-y-2 mt-3">
              {/* Auto Advance */}
              <div className="flex items-center justify-between p-3 rounded-2xl bg-[#141210] border border-white/[0.08]">
                <div>
                  <span className="text-xs font-medium text-[#f5f2eb] block">Auto-advance after solving</span>
                  <span className="text-[10px] text-[#78716c]">Automatically swipe to next puzzle after solve</span>
                </div>

                <button
                  type="button"
                  data-testid="settings-auto-advance-toggle"
                  aria-label="Toggle auto-advance after solving"
                  onClick={handleToggleAutoAdvance}
                  className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                    autoAdvance ? "bg-[#c29b78]" : "bg-white/[0.1]"
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full bg-[#0a0908] transition-transform duration-200 absolute top-1 left-1 ${
                      autoAdvance ? "translate-x-5 bg-[#0a0908]" : "translate-x-0 bg-white"
                    }`}
                  />
                </button>
              </div>

              {/* Board Coordinates / Markings */}
              <div className="flex items-center justify-between p-3 rounded-2xl bg-[#141210] border border-white/[0.08]">
                <div>
                  <span className="text-xs font-medium text-[#f5f2eb] block">Board Markings</span>
                  <span className="text-[10px] text-[#78716c]">Display coordinates notation on rank & file (a-h, 1-8)</span>
                </div>

                <button
                  type="button"
                  data-testid="toggle-coordinates-btn"
                  onClick={handleToggleCoordinates}
                  className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                    showCoordinates ? "bg-[#c29b78]" : "bg-white/[0.1]"
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full bg-[#0a0908] transition-transform duration-200 absolute top-1 left-1 ${
                      showCoordinates ? "translate-x-5 bg-[#0a0908]" : "translate-x-0 bg-white"
                    }`}
                  />
                </button>
              </div>

              {/* Animation Speed */}
              <div className="p-3 rounded-2xl bg-[#141210] border border-white/[0.08]">
                <span className="text-xs font-medium text-[#f5f2eb] block mb-2">Piece Animation Speed</span>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { id: "snappy", label: "Snappy", time: "200ms" },
                    { id: "smooth", label: "Smooth", time: "300ms" },
                    { id: "instant", label: "Instant", time: "0ms" },
                  ].map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => handleSelectAnimSpeed(s.id as any)}
                      className={`py-2 px-1 rounded-xl text-center border text-xs transition-all cursor-pointer ${
                        animSpeed === s.id
                          ? "bg-[#c29b78]/[0.12] border-[#c29b78] text-[#c29b78] font-medium"
                          : "bg-white/[0.03] border-white/[0.06] text-[#78716c] hover:border-white/20"
                      }`}
                    >
                      <span className="block font-medium">{s.label}</span>
                      <span className="text-[10px] opacity-70 font-mono">{s.time}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="h-px bg-white/[0.06]" />

          {/* ======================================================== */}
          {/* 5. SUPPORT & CONTACT                                     */}
          {/* ======================================================== */}
          <div className="p-3 rounded-2xl bg-[#141210] border border-white/[0.08] flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-white/[0.04] text-[#c29b78] border border-white/[0.06]">
                <Headphones className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-medium text-[#f5f2eb] block">Support &amp; Feedback</span>
                <span className="text-[10px] text-[#78716c]">{SUPPORT_EMAIL}</span>
              </div>
            </div>
            <a
              href={SUPPORT_MAILTO}
              className="px-3 py-1.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-zinc-200 text-xs font-medium border border-white/10 flex items-center gap-1 transition-colors"
            >
              <span>Email</span>
              <ExternalLink className="w-3 h-3 text-zinc-400" />
            </a>
          </div>

          <div className="h-px bg-white/[0.06]" />

          {/* ======================================================== */}
          {/* 6. ACCOUNT ACTIONS & SIGNOUT                             */}
          {/* ======================================================== */}
          <div className="pt-1">
            {onSignOut && (
              <button
                type="button"
                onClick={() => {
                  onSignOut();
                  onClose();
                }}
                className="w-full py-2.5 rounded-xl border border-rose-500/20 bg-rose-500/10 hover:bg-rose-500/15 text-rose-400 text-xs font-medium transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out of DoomChess</span>
              </button>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/[0.08] bg-[#141210] shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="w-full h-11 rounded-full bg-white/[0.08] hover:bg-white/[0.12] text-[#f5f2eb] font-semibold text-xs tracking-wide transition-all active:scale-[0.98] cursor-pointer"
          >
            Close Settings
          </button>
        </div>
      </div>
    </div>
  );
}
