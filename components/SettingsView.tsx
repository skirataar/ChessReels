"use client";

import React, { useState, useEffect } from "react";
import {
  ChevronLeft,
  Settings as SettingsIcon,
  Palette,
  Volume2,
  VolumeX,
  Vibrate,
  Zap,
  Check,
  RotateCcw,
  LogOut,
  AlertCircle,
  Loader2,
  ShieldCheck,
  Crown,
  Lock,
  SlidersHorizontal,
  Mail,
  KeyRound,
  Eye,
  EyeOff,
  ExternalLink,
  HelpCircle,
  Sparkles,
} from "lucide-react";
import { BOARD_THEMES, BoardTheme, useBoardTheme } from "@/lib/boardThemes";
import { sounds } from "@/lib/audio";
import { haptics } from "@/lib/haptics";
import { isGuestUserId } from "@/lib/guestAccount";
import { SUPPORT_EMAIL, SUPPORT_MAILTO } from "@/lib/support";
import { OtpModal } from "@/components/OtpModal";
import { AboutModal } from "@/components/AboutModal";
import { clearAllUserAndPuzzleCache } from "@/lib/puzzleCache";
import posthog from "posthog-js";

export interface SettingsViewProps {
  onBack: () => void;
  userAccount?: {
    id: string;
    username: string;
    displayName?: string;
    avatar?: string;
    plan?: string;
    elo?: number;
    email?: string;
    twoFactorEnabled?: boolean;
    targetElo?: number | null;
  } | null;
  guestId?: string;
  onSignOut?: () => void;
  onResetElo?: () => void;
  onOpenUpgrade?: () => void;
}

export function SettingsView({
  onBack,
  userAccount,
  guestId = "guest",
  onSignOut,
  onResetElo,
  onOpenUpgrade,
}: SettingsViewProps) {
  const [boardTheme, setBoardTheme] = useBoardTheme();

  // Audio & Haptic state
  const [isSfxEnabled, setIsSfxEnabled] = useState<boolean>(true);
  const [isHapticsEnabled, setIsHapticsEnabled] = useState<boolean>(true);

  // Gameplay state
  const [autoAdvance, setAutoAdvance] = useState<boolean>(false);
  const [showCoordinates, setShowCoordinates] = useState<boolean>(true);
  const [animSpeed, setAnimSpeed] = useState<"snappy" | "smooth" | "instant">("snappy");

  // Target Elo state
  const [targetElo, setTargetElo] = useState<number>(() => {
    if (typeof window !== "undefined") {
      const stored = window.localStorage.getItem("chess_reel_target_elo");
      if (stored) {
        const parsed = parseInt(stored, 10);
        if (!isNaN(parsed) && parsed > 0) return parsed;
      }
    }
    return userAccount?.targetElo || 1500;
  });
  const [isSavingTargetElo, setIsSavingTargetElo] = useState<boolean>(false);

  // 2FA state
  const [twoFactorEnabled, setTwoFactorEnabled] = useState<boolean>(Boolean(userAccount?.twoFactorEnabled));
  const [isToggling2FA, setIsToggling2FA] = useState<boolean>(false);
  const [twoFactorMsg, setTwoFactorMsg] = useState<{ type: "error" | "success"; text: string } | null>(null);
  const [is2faOtpOpen, setIs2faOtpOpen] = useState<boolean>(false);

  // Password state
  const [isChangingPassword, setIsChangingPassword] = useState<boolean>(false);
  const [currentPassword, setCurrentPassword] = useState<string>("");
  const [newPassword, setNewPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");
  const [showCurrentPassword, setShowCurrentPassword] = useState<boolean>(false);
  const [showNewPassword, setShowNewPassword] = useState<boolean>(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [isPasswordSubmitting, setIsPasswordSubmitting] = useState<boolean>(false);

  // Modals & confirmation
  const [showResetConfirm, setShowResetConfirm] = useState<boolean>(false);
  const [isAboutOpen, setIsAboutOpen] = useState<boolean>(false);

  // Initial sync
  useEffect(() => {
    if (typeof window === "undefined") return;

    // SFX
    setIsSfxEnabled(!sounds.getIsMuted());

    // Haptics
    const savedHaptics = window.localStorage.getItem("doomchess_haptics") ?? window.localStorage.getItem("chess_reel_haptics");
    setIsHapticsEnabled(savedHaptics !== null ? (savedHaptics === "true" || savedHaptics === "1") : true);

    // Auto advance
    const auto = window.localStorage.getItem("chess_reel_auto_advance");
    setAutoAdvance(auto === "1" || auto === "true");

    // Board coordinates
    const coords = window.localStorage.getItem("chess_reel_show_coordinates");
    setShowCoordinates(coords !== "0");

    // Anim speed
    const speed = window.localStorage.getItem("chess_reel_anim_speed");
    if (speed === "smooth" || speed === "instant" || speed === "snappy") {
      setAnimSpeed(speed);
    }

    // 2FA sync
    if (userAccount?.twoFactorEnabled !== undefined) {
      setTwoFactorEnabled(Boolean(userAccount.twoFactorEnabled));
    } else {
      const stored = window.localStorage.getItem("chess_reel_account");
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          setTwoFactorEnabled(Boolean(parsed.twoFactorEnabled));
        } catch {}
      }
    }
  }, [userAccount]);

  const handleToggleSound = () => {
    haptics.trigger("button");
    const nextState = !isSfxEnabled;
    setIsSfxEnabled(nextState);
    sounds.setIsMuted(!nextState);
    if (nextState) {
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

  const handleToggleHaptics = () => {
    haptics.trigger("button");
    const nextState = !isHapticsEnabled;
    setIsHapticsEnabled(nextState);
    haptics.setEnabled(nextState);
    if (nextState) {
      haptics.trigger("solve");
    }
  };

  const handleToggleAutoAdvance = () => {
    haptics.trigger("button");
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

  const handleToggleCoordinates = () => {
    haptics.trigger("button");
    const next = !showCoordinates;
    setShowCoordinates(next);
    if (typeof window !== "undefined") {
      window.localStorage.setItem("chess_reel_show_coordinates", next ? "1" : "0");
      window.dispatchEvent(
        new CustomEvent("board-coordinates-updated", { detail: { show: next } })
      );
    }
  };

  const handleSelectAnimSpeed = (speed: "snappy" | "smooth" | "instant") => {
    haptics.trigger("select");
    setAnimSpeed(speed);
    if (typeof window !== "undefined") {
      window.localStorage.setItem("chess_reel_anim_speed", speed);
      window.dispatchEvent(
        new CustomEvent("board-anim-speed-updated", { detail: { speed } })
      );
    }
  };

  const handleSelectTargetElo = async (elo: number) => {
    haptics.trigger("select");
    setTargetElo(elo);
    setIsSavingTargetElo(true);
    if (typeof window !== "undefined") {
      window.localStorage.setItem("chess_reel_target_elo", elo.toString());
      window.dispatchEvent(
        new CustomEvent("target-elo-updated", { detail: { targetElo: elo } })
      );
    }
    if (userAccount?.id && !isGuestUserId(userAccount.id)) {
      try {
        await fetch("/api/user/account", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: userAccount.id, targetElo: elo }),
        });
      } catch {}
    }
    setIsSavingTargetElo(false);
  };

  const handleToggle2FA = async () => {
    haptics.trigger("button");
    setTwoFactorMsg(null);
    let emailToUse = userAccount?.email;
    if (!emailToUse && typeof window !== "undefined") {
      try {
        const stored = window.localStorage.getItem("chess_reel_account");
        if (stored) {
          const parsed = JSON.parse(stored);
          emailToUse = parsed.email;
        }
      } catch {}
    }

    if (!emailToUse) {
      setTwoFactorMsg({
        type: "error",
        text: "An email address must be associated with your account to enable 2FA.",
      });
      return;
    }

    setIsToggling2FA(true);
    try {
      if (!twoFactorEnabled) {
        const res = await fetch("/api/auth/2fa/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: emailToUse }),
        });
        const data = await res.json();
        if (!res.ok) {
          setTwoFactorMsg({ type: "error", text: data.error || "Failed to send 2FA code." });
          setIsToggling2FA(false);
          return;
        }
        setIs2faOtpOpen(true);
      } else {
        const res = await fetch("/api/auth/2fa/disable", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: emailToUse }),
        });
        const data = await res.json();
        if (!res.ok) {
          setTwoFactorMsg({ type: "error", text: data.error || "Failed to disable 2FA." });
          setIsToggling2FA(false);
          return;
        }
        setTwoFactorEnabled(false);
        if (typeof window !== "undefined") {
          const stored = window.localStorage.getItem("chess_reel_account");
          const existing = stored ? JSON.parse(stored) : {};
          window.localStorage.setItem("chess_reel_account", JSON.stringify({ ...existing, twoFactorEnabled: false }));
          window.dispatchEvent(new Event("account-updated"));
        }
        setTwoFactorMsg({ type: "success", text: "Two-factor authentication disabled." });
        setTimeout(() => setTwoFactorMsg(null), 3000);
      }
    } catch {
      setTwoFactorMsg({ type: "error", text: "Network error. Please try again." });
    } finally {
      setIsToggling2FA(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    if (!newPassword || newPassword.length < 6) {
      setPasswordError("New password must be at least 6 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords do not match.");
      return;
    }

    setIsPasswordSubmitting(true);
    try {
      const res = await fetch("/api/user/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: userAccount?.id,
          currentPassword,
          newPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setPasswordError(data.error || "Failed to update password.");
      } else {
        setPasswordSuccess("Password updated successfully.");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setTimeout(() => {
          setIsChangingPassword(false);
          setPasswordSuccess(null);
        }, 2200);
      }
    } catch {
      setPasswordError("Network error. Please try again.");
    } finally {
      setIsPasswordSubmitting(false);
    }
  };

  const handleConfirmResetRating = () => {
    haptics.trigger("blunder");
    if (onResetElo) {
      onResetElo();
    }
    setShowResetConfirm(false);
  };

  const isPro = userAccount?.plan === "premium" || (typeof window !== "undefined" && window.localStorage.getItem("chess_reel_plan") === "premium");

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0a0908] text-zinc-100 overflow-y-auto no-scrollbar pb-16">
      {/* Top Sticky Header */}
      <div className="sticky top-0 z-30 bg-[#0a0908]/95 backdrop-blur-md px-4 py-3 flex items-center justify-between border-b border-white/[0.08]">
        <button
          type="button"
          onClick={() => {
            haptics.trigger("button");
            onBack();
          }}
          className="flex items-center gap-1.5 py-1 px-2 -ml-2 rounded-lg text-zinc-300 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
        >
          <label htmlFor="doomchess-taptic-switch" className="contents cursor-pointer">
            <ChevronLeft className="w-5 h-5 text-[#c29b78]" />
            <span className="text-xs font-semibold text-zinc-200">Profile</span>
          </label>
        </button>

        <h2 className="text-xs font-bold tracking-widest text-zinc-100 uppercase">
          SETTINGS
        </h2>

        <div className="w-12 flex justify-end" />
      </div>

      <div className="p-4 space-y-6 max-w-lg mx-auto w-full">
        {/* SECTION 1: BOARD & APPEARANCE */}
        <section className="space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#c29b78]">
            <Palette className="w-4 h-4 text-[#c29b78]" />
            <span>Board &amp; Appearance</span>
          </div>

          <div className="p-3.5 rounded-xl bg-[#12100e] border border-white/10 space-y-4">
            {/* Theme Selector */}
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-xs font-semibold text-zinc-200">Chessboard Theme</span>
                <span className="text-[11px] font-mono text-[#c29b78] font-bold">
                  {boardTheme.name}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {BOARD_THEMES.map((theme) => {
                  const isSelected = boardTheme.id === theme.id;
                  return (
                    <button
                      key={theme.id}
                      type="button"
                      onClick={() => {
                        haptics.trigger("select");
                        setBoardTheme(theme.id);
                      }}
                      className={`relative flex flex-col items-center p-2 rounded-lg border transition-all cursor-pointer ${
                        isSelected
                          ? "bg-[#1c1815] border-[#c29b78] shadow-[0_0_12px_rgba(194,155,120,0.25)]"
                          : "bg-[#181512] border-white/5 hover:border-white/15"
                      }`}
                    >
                      <label htmlFor="doomchess-taptic-switch" className="contents cursor-pointer">
                        {/* 2x2 Board Preview Swatch */}
                        <div className="w-12 h-12 rounded grid grid-cols-2 grid-rows-2 overflow-hidden border border-black/40 shadow-inner mb-1.5">
                          <div style={{ backgroundColor: theme.light }} />
                          <div style={{ backgroundColor: theme.dark }} />
                          <div style={{ backgroundColor: theme.dark }} />
                          <div style={{ backgroundColor: theme.light }} />
                        </div>

                        <span
                          className={`text-[10px] font-medium truncate max-w-full ${
                            isSelected ? "text-[#c29b78] font-bold" : "text-zinc-400"
                          }`}
                        >
                          {theme.name}
                        </span>

                        {isSelected && (
                          <div className="absolute top-1 right-1 w-3.5 h-3.5 rounded-full bg-[#c29b78] text-[#0a0908] flex items-center justify-center">
                            <Check className="w-2.5 h-2.5 stroke-[3]" />
                          </div>
                        )}
                      </label>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Board Coordinates Toggle */}
            <div className="pt-3 border-t border-white/5 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-zinc-200">Board Coordinates</p>
                <p className="text-[11px] text-zinc-500">Show 1-8 and a-h notations along board edge</p>
              </div>

              <button
                type="button"
                onClick={handleToggleCoordinates}
                role="switch"
                aria-checked={showCoordinates}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  showCoordinates ? "bg-[#c29b78]" : "bg-zinc-800"
                }`}
              >
                <label htmlFor="doomchess-taptic-switch" className="contents cursor-pointer">
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-zinc-100 shadow-md ring-0 transition duration-200 ease-in-out ${
                      showCoordinates ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </label>
              </button>
            </div>

            {/* Animation Speed Selector */}
            <div className="pt-3 border-t border-white/5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-zinc-200">Move Speed</span>
                <span className="text-[11px] font-mono text-[#c29b78] uppercase">{animSpeed}</span>
              </div>

              <div className="grid grid-cols-3 gap-1.5 p-1 bg-[#0a0908] rounded-lg border border-white/5">
                {(["snappy", "smooth", "instant"] as const).map((speed) => {
                  const isActive = animSpeed === speed;
                  return (
                    <button
                      key={speed}
                      type="button"
                      onClick={() => handleSelectAnimSpeed(speed)}
                      className={`py-1.5 text-xs font-semibold capitalize rounded-md transition-all cursor-pointer ${
                        isActive
                          ? "bg-[#25201b] text-[#c29b78] border border-[#c29b78]/30 shadow-sm"
                          : "text-zinc-400 hover:text-zinc-200"
                      }`}
                    >
                      <label htmlFor="doomchess-taptic-switch" className="contents cursor-pointer">
                        {speed}
                      </label>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 2: AUDIO & HAPTICS */}
        <section className="space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#c29b78]">
            <Volume2 className="w-4 h-4 text-[#c29b78]" />
            <span>Audio &amp; Haptics</span>
          </div>

          <div className="p-3.5 rounded-xl bg-[#12100e] border border-white/10 space-y-3.5">
            {/* Sound FX Toggle */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-[#c29b78]">
                  {isSfxEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 text-zinc-500" />}
                </div>
                <div>
                  <p className="text-xs font-semibold text-zinc-200">Sound Effects</p>
                  <p className="text-[11px] text-zinc-500">Piece move, capture, and solve sounds</p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleToggleSound}
                role="switch"
                aria-checked={isSfxEnabled}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  isSfxEnabled ? "bg-[#c29b78]" : "bg-zinc-800"
                }`}
              >
                <label htmlFor="doomchess-taptic-switch" className="contents cursor-pointer">
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-zinc-100 shadow-md ring-0 transition duration-200 ease-in-out ${
                      isSfxEnabled ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </label>
              </button>
            </div>

            {/* Haptic Feedback Toggle */}
            <div className="pt-3 border-t border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-[#c29b78]">
                  <Vibrate className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-zinc-200">Haptic Feedback</p>
                  <p className="text-[11px] text-zinc-500">Hardware vibration &amp; iOS Taptic Engine</p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleToggleHaptics}
                role="switch"
                aria-checked={isHapticsEnabled}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  isHapticsEnabled ? "bg-[#c29b78]" : "bg-zinc-800"
                }`}
              >
                <label htmlFor="doomchess-taptic-switch" className="contents cursor-pointer">
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-zinc-100 shadow-md ring-0 transition duration-200 ease-in-out ${
                      isHapticsEnabled ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </label>
              </button>
            </div>

            {/* Auto Advance Toggle */}
            <div className="pt-3 border-t border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-[#c29b78]">
                  <Zap className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-zinc-200">Auto-Advance</p>
                  <p className="text-[11px] text-zinc-500">Proceed to next puzzle automatically on solve</p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleToggleAutoAdvance}
                role="switch"
                aria-checked={autoAdvance}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  autoAdvance ? "bg-[#c29b78]" : "bg-zinc-800"
                }`}
              >
                <label htmlFor="doomchess-taptic-switch" className="contents cursor-pointer">
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-zinc-100 shadow-md ring-0 transition duration-200 ease-in-out ${
                      autoAdvance ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </label>
              </button>
            </div>
          </div>
        </section>

        {/* SECTION 3: ACCOUNT & SECURITY */}
        <section className="space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#c29b78]">
            <ShieldCheck className="w-4 h-4 text-[#c29b78]" />
            <span>Account &amp; Security</span>
          </div>

          <div className="p-3.5 rounded-xl bg-[#12100e] border border-white/10 space-y-4">
            {/* Account Info */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-zinc-400">
                  <Mail className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-zinc-200">
                    {userAccount?.email || "Guest Tactician"}
                  </p>
                  <p className="text-[11px] font-mono text-zinc-500">
                    {userAccount?.username ? `@${userAccount.username}` : "Unregistered Guest"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                {isPro ? (
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#c29b78]/15 text-[#c29b78] border border-[#c29b78]/30">
                    <Crown className="w-3 h-3" />
                    PRO
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-white/5 text-zinc-400 border border-white/10">
                    FREE
                  </span>
                )}
              </div>
            </div>

            {/* Target ELO Goal */}
            <div className="pt-3 border-t border-white/5 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-zinc-200">Target ELO Goal</p>
                  <p className="text-[11px] text-zinc-500">Calibrates your tactical progression target</p>
                </div>
                <span className="text-xs font-mono font-bold text-[#c29b78]">
                  {targetElo} ELO
                </span>
              </div>

              <div className="grid grid-cols-4 gap-1.5">
                {[1200, 1500, 1800, 2000].map((tElo) => {
                  const isSelected = targetElo === tElo;
                  return (
                    <button
                      key={tElo}
                      type="button"
                      onClick={() => handleSelectTargetElo(tElo)}
                      disabled={isSavingTargetElo}
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

            {/* Pro Subscription Block */}
            <div className="pt-3 border-t border-white/5">
              <div className="p-3 rounded-lg bg-gradient-to-r from-[#1c1815] to-[#241f1a] border border-[#c29b78]/25 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-[#c29b78]/20 flex items-center justify-center text-[#c29b78]">
                    <Crown className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-zinc-100">
                      {isPro ? "Pro Membership Active" : "DoomChess Pro"}
                    </p>
                    <p className="text-[11px] text-zinc-400">
                      {isPro ? "Unlimited puzzles & tactical analytics" : "Unlock unlimited daily puzzles"}
                    </p>
                  </div>
                </div>

                {!isPro && onOpenUpgrade && (
                  <button
                    type="button"
                    onClick={() => {
                      haptics.trigger("button");
                      onOpenUpgrade();
                    }}
                    className="py-1.5 px-3 rounded-lg bg-gradient-to-r from-[#c29b78] to-[#d4b08f] text-[#0a0908] text-xs font-bold shadow-md hover:brightness-105 active:scale-95 transition-all cursor-pointer"
                  >
                    <label htmlFor="doomchess-taptic-switch" className="contents cursor-pointer">
                      Upgrade
                    </label>
                  </button>
                )}
              </div>
            </div>

            {/* 2FA Toggle */}
            {userAccount && userAccount.email && (
              <div className="pt-3 border-t border-white/5 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-[#c29b78]">
                      <Lock className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-zinc-200">Two-Factor Auth</p>
                      <p className="text-[11px] text-zinc-500">Secure sign-in via email OTP</p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleToggle2FA}
                    disabled={isToggling2FA}
                    className={`py-1.5 px-3 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                      twoFactorEnabled
                        ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                        : "bg-white/5 border-white/10 text-zinc-300 hover:border-white/20"
                    }`}
                  >
                    <label htmlFor="doomchess-taptic-switch" className="contents cursor-pointer">
                      {isToggling2FA ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : twoFactorEnabled ? (
                        "Enabled"
                      ) : (
                        "Enable"
                      )}
                    </label>
                  </button>
                </div>

                {twoFactorMsg && (
                  <p
                    className={`text-[11px] ${
                      twoFactorMsg.type === "error" ? "text-rose-400" : "text-emerald-400"
                    }`}
                  >
                    {twoFactorMsg.text}
                  </p>
                )}
              </div>
            )}

            {/* Change Password Collapsible */}
            {userAccount && userAccount.email && (
              <div className="pt-3 border-t border-white/5 space-y-2">
                <button
                  type="button"
                  onClick={() => {
                    haptics.trigger("button");
                    setIsChangingPassword(!isChangingPassword);
                  }}
                  className="w-full flex items-center justify-between text-xs font-semibold text-zinc-300 hover:text-white py-1 cursor-pointer"
                >
                  <label htmlFor="doomchess-taptic-switch" className="contents cursor-pointer">
                    <span className="flex items-center gap-2">
                      <KeyRound className="w-3.5 h-3.5 text-[#c29b78]" />
                      <span>Change Password</span>
                    </span>
                    <span className="text-[11px] text-[#c29b78]">
                      {isChangingPassword ? "Cancel" : "Update"}
                    </span>
                  </label>
                </button>

                {isChangingPassword && (
                  <form onSubmit={handleChangePassword} className="space-y-2.5 pt-2 animate-in fade-in">
                    <div>
                      <label className="text-[11px] text-zinc-400 block mb-1">Current Password</label>
                      <div className="relative">
                        <input
                          type={showCurrentPassword ? "text" : "password"}
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          placeholder="Current password"
                          className="w-full px-3 py-2 rounded-lg bg-[#0a0908] border border-white/10 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-[#c29b78]"
                        />
                        <button
                          type="button"
                          onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                        >
                          {showCurrentPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] text-zinc-400 block mb-1">New Password</label>
                      <div className="relative">
                        <input
                          type={showNewPassword ? "text" : "password"}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="Min. 6 characters"
                          className="w-full px-3 py-2 rounded-lg bg-[#0a0908] border border-white/10 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-[#c29b78]"
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                        >
                          {showNewPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] text-zinc-400 block mb-1">Confirm New Password</label>
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Re-type new password"
                        className="w-full px-3 py-2 rounded-lg bg-[#0a0908] border border-white/10 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-[#c29b78]"
                      />
                    </div>

                    {passwordError && (
                      <p className="text-[11px] text-rose-400">{passwordError}</p>
                    )}
                    {passwordSuccess && (
                      <p className="text-[11px] text-emerald-400">{passwordSuccess}</p>
                    )}

                    <button
                      type="submit"
                      disabled={isPasswordSubmitting}
                      className="w-full py-2 rounded-lg bg-[#c29b78] hover:bg-[#d4b08f] text-[#0a0908] text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <label htmlFor="doomchess-taptic-switch" className="contents cursor-pointer">
                        {isPasswordSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                        <span>Save Password</span>
                      </label>
                    </button>
                  </form>
                )}
              </div>
            )}

            {/* Reset Rating Action */}
            {onResetElo && (
              <div className="pt-3 border-t border-white/5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-zinc-200">Reset ELO Rating</p>
                  <p className="text-[11px] text-zinc-500">Recalibrate your tactical rating</p>
                </div>

                {showResetConfirm ? (
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={handleConfirmResetRating}
                      className="px-2.5 py-1 rounded bg-rose-500/20 text-rose-400 border border-rose-500/40 text-[11px] font-bold cursor-pointer"
                    >
                      <label htmlFor="doomchess-taptic-switch" className="contents cursor-pointer">
                        Confirm
                      </label>
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowResetConfirm(false)}
                      className="px-2 py-1 rounded bg-white/5 text-zinc-400 text-[11px] cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowResetConfirm(true)}
                    className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-400 hover:bg-white/5 transition-colors cursor-pointer"
                    title="Reset Rating"
                  >
                    <label htmlFor="doomchess-taptic-switch" className="contents cursor-pointer">
                      <RotateCcw className="w-4 h-4" />
                    </label>
                  </button>
                )}
              </div>
            )}
          </div>
        </section>

        {/* SECTION 4: ABOUT & SUPPORT */}
        <section className="space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#c29b78]">
            <HelpCircle className="w-4 h-4 text-[#c29b78]" />
            <span>Support &amp; Info</span>
          </div>

          <div className="p-3.5 rounded-xl bg-[#12100e] border border-white/10 space-y-2">
            <button
              type="button"
              onClick={() => {
                haptics.trigger("button");
                setIsAboutOpen(true);
              }}
              className="w-full flex items-center justify-between py-2 px-2.5 rounded-lg hover:bg-white/5 text-xs text-zinc-300 hover:text-white transition-colors cursor-pointer"
            >
              <label htmlFor="doomchess-taptic-switch" className="contents cursor-pointer">
                <span>About DoomChess</span>
                <span className="text-[11px] font-mono text-zinc-500">v2.0</span>
              </label>
            </button>

            <a
              href={SUPPORT_MAILTO}
              className="w-full flex items-center justify-between py-2 px-2.5 rounded-lg hover:bg-white/5 text-xs text-zinc-300 hover:text-white transition-colors cursor-pointer"
            >
              <label htmlFor="doomchess-taptic-switch" className="contents cursor-pointer">
                <span>Contact Support</span>
                <ExternalLink className="w-3.5 h-3.5 text-zinc-500" />
              </label>
            </a>
          </div>
        </section>

        {/* SIGN OUT BUTTON */}
        {onSignOut && (
          <div className="pt-2">
            <button
              type="button"
              onClick={() => {
                haptics.trigger("button");
                onSignOut();
              }}
              className="w-full py-3 rounded-xl bg-[#181312] hover:bg-rose-950/30 text-rose-400 border border-rose-500/20 hover:border-rose-500/40 text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm active:scale-[0.99]"
            >
              <label htmlFor="doomchess-taptic-switch" className="contents cursor-pointer">
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </label>
            </button>
          </div>
        )}
      </div>

      {/* 2FA OTP Verification Modal */}
      {is2faOtpOpen && (
        <OtpModal
          isOpen={is2faOtpOpen}
          onClose={() => setIs2faOtpOpen(false)}
          email={userAccount?.email || ""}
          type="2FA"
          isActivation={true}
          onSuccess={() => {
            setTwoFactorEnabled(true);
            setIs2faOtpOpen(false);
            if (typeof window !== "undefined") {
              const stored = window.localStorage.getItem("chess_reel_account");
              const existing = stored ? JSON.parse(stored) : {};
              window.localStorage.setItem("chess_reel_account", JSON.stringify({ ...existing, twoFactorEnabled: true }));
              window.dispatchEvent(new Event("account-updated"));
            }
            setTwoFactorMsg({ type: "success", text: "Two-factor authentication enabled." });
            setTimeout(() => setTwoFactorMsg(null), 3000);
          }}
        />
      )}

      {/* About Modal */}
      {isAboutOpen && (
        <AboutModal
          isOpen={isAboutOpen}
          onClose={() => setIsAboutOpen(false)}
        />
      )}
    </div>
  );
}
