"use client";

import React, { useState, useRef } from "react";
import {
  X,
  ArrowRight,
  LogIn,
  UserPlus,
  ShieldCheck,
  Check,
  Lock,
  Eye,
  EyeOff,
  Sparkles,
  Upload,
  Camera,
  Target,
  Zap,
  Trophy,
} from "lucide-react";
import { compressImageFile } from "@/lib/avatarUpload";
import { UserAvatar } from "@/components/UserAvatar";
import { OtpModal } from "@/components/OtpModal";
import {
  getGuestSession,
  syncGuestSessionToAccount,
  clearGuestSession,
  TOTAL_PLACEMENT_STEPS,
} from "@/lib/placementEngine";

export interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  guestId: string;
  initialTab?: "register" | "login";
  initialShowGoogle?: boolean;
  onAccountSuccess: (user: {
    id: string;
    username: string;
    displayName?: string;
    avatar?: string;
    elo: number;
    isCalibrated: boolean;
    calibrationStep: number;
    plan?: string;
  }) => void;
}

export type SkillLevel = "beginner" | "intermediate" | "advanced";

export function AuthModal({
  isOpen,
  onClose,
  guestId,
  initialTab = "register",
  initialShowGoogle = false,
  onAccountSuccess,
}: AuthModalProps) {
  const [tab, setTab] = useState<"register" | "login">(initialTab);
  const [username, setUsername] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [displayName, setDisplayName] = useState<string>("");
  const [selectedAvatar, setSelectedAvatar] = useState<string>("");
  const guestSession = getGuestSession();
  const calibratedElo = guestSession.calibratedElo || guestSession.estimatedElo || 1000;
  const isCalibrated = Boolean(guestSession.calibratedElo || guestSession.currentStep >= 6);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState<boolean>(false);
  const [otpState, setOtpState] = useState<{
    isOpen: boolean;
    email: string;
    type: "VERIFY_EMAIL" | "2FA";
  }>({
    isOpen: false,
    email: "",
    type: "VERIFY_EMAIL",
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setIsUploadingPhoto(true);
      const compressedDataUrl = await compressImageFile(file, 256);
      setSelectedAvatar(compressedDataUrl);
    } catch (err: any) {
      console.error("Failed to upload photo:", err);
      setErrorMsg(err.message || "Could not process photo.");
    } finally {
      setIsUploadingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  if (!isOpen) return null;

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    const cleanUser = username.trim().toLowerCase();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanUser) {
      setErrorMsg("Please choose a username.");
      return;
    }

    if (!/^[a-z0-9_]{3,20}$/.test(cleanUser)) {
      setErrorMsg("Username must be 3-20 letters, numbers, or underscores.");
      return;
    }

    if (cleanEmail) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(cleanEmail)) {
        setErrorMsg("Please enter a valid email address.");
        return;
      }
    }

    if (!password || password.length < 6) {
      setErrorMsg("Password must be at least 6 characters long.");
      return;
    }

    if (confirmPassword && password !== confirmPassword) {
      setErrorMsg("Passwords do not match.");
      return;
    }

    const currentGuest = getGuestSession();
    const hasCompletedPlacement = Boolean(
      currentGuest.isComplete ||
      currentGuest.calibratedElo ||
      (currentGuest.history && currentGuest.history.length >= TOTAL_PLACEMENT_STEPS)
    );
    const effectiveCalibratedElo = currentGuest.calibratedElo ?? calibratedElo;
    const effectiveIsCalibrated = hasCompletedPlacement || isCalibrated;

    setIsLoading(true);
    try {
      const res = await fetch("/api/user/account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          guestId,
          username: cleanUser,
          email: cleanEmail || undefined,
          password,
          displayName: displayName.trim() || undefined,
          avatar: selectedAvatar,
          elo: effectiveCalibratedElo,
          startingElo: effectiveCalibratedElo,
          calibratedElo: effectiveCalibratedElo,
          isCalibrated: effectiveIsCalibrated,
          hasCompletedPlacement,
          calibrationStep: hasCompletedPlacement ? 6 : currentGuest.currentStep,
          puzzleHistory: currentGuest.history,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || "Could not create account.");
        setIsLoading(false);
        return;
      }

      if (data.requiresEmailVerification && data.email) {
        setOtpState({
          isOpen: true,
          email: data.email,
          type: "VERIFY_EMAIL",
        });
        setIsLoading(false);
        return;
      }

      if (data.user?.id) {
        await syncGuestSessionToAccount(data.user.id).catch(() => {});
        clearGuestSession();
      }
      const safeUser = {
        ...data.user,
        isCalibrated: effectiveIsCalibrated || Boolean(data.user?.isCalibrated),
        elo: effectiveCalibratedElo || data.user?.elo,
      };
      onAccountSuccess(safeUser);
      onClose();
    } catch {
      setErrorMsg("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    const cleanUser = username.trim().toLowerCase();

    if (!cleanUser) {
      setErrorMsg("Please enter your username or email.");
      return;
    }

    if (!password) {
      setErrorMsg("Please enter your password.");
      return;
    }

    setIsLoading(true);
    try {
      const currentGuest = getGuestSession();
      const hasCompletedPlacement = Boolean(
        currentGuest && (currentGuest.isComplete || currentGuest.calibratedElo)
      );

      const res = await fetch("/api/user/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: cleanUser,
          password,
          hasCompletedPlacement,
          calibratedElo: currentGuest?.calibratedElo,
          isCalibrated: hasCompletedPlacement,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || "Could not sign in.");
        setIsLoading(false);
        return;
      }

      if (data.requiresEmailVerification && data.email) {
        setOtpState({
          isOpen: true,
          email: data.email,
          type: "VERIFY_EMAIL",
        });
        setIsLoading(false);
        return;
      }

      if (data.requires2FA && data.email) {
        setOtpState({
          isOpen: true,
          email: data.email,
          type: "2FA",
        });
        setIsLoading(false);
        return;
      }

      if (data.user) {
        if (hasCompletedPlacement) {
          data.user.isCalibrated = true;
          data.user.calibrationStep = TOTAL_PLACEMENT_STEPS;
          if (currentGuest?.calibratedElo) {
            data.user.elo = currentGuest.calibratedElo;
          }
          await syncGuestSessionToAccount(data.user.id).catch(() => {});
          clearGuestSession();
        }
        onAccountSuccess(data.user);
      }
      onClose();
    } catch {
      setErrorMsg("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleOAuthRedirect = () => {
    setIsLoading(true);
    const returnUrl = encodeURIComponent(
      typeof window !== "undefined" ? window.location.pathname : "/play"
    );
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.href = `/api/auth/google?startingElo=${calibratedElo}&guestId=${encodeURIComponent(guestId)}&returnUrl=${returnUrl}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="w-full max-w-md max-h-[92vh] flex flex-col rounded-2xl bg-[#151413] border border-white/10 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 text-[#f5f5f5]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-modal-title"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-[#22201e]/80 backdrop-blur-sm">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#c29b78]/15 border border-[#c29b78]/30 flex items-center justify-center text-[#c29b78]">
              {tab === "register" ? <UserPlus className="w-4 h-4" /> : <LogIn className="w-4 h-4" />}
            </div>
            <div>
              <h2 id="auth-modal-title" className="text-base font-bold text-[#f5f5f5] tracking-tight">
                {tab === "register" ? "Create Account" : "Sign In"}
              </h2>
              <p className="text-[11px] text-[#a3a3a3] font-medium">
                {tab === "register"
                  ? "Save your rating & streaks securely in the cloud"
                  : "Welcome back to DoomChess"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close modal"
            className="w-8 h-8 rounded-full flex items-center justify-center text-[#a3a3a3] hover:text-[#f5f5f5] bg-[#22201e] hover:bg-[#2d2a28] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
            {/* Tab Switcher */}
            <div className="flex border-b border-white/10 bg-[#22201e]/40 p-1.5 gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setTab("register");
                  setErrorMsg(null);
                }}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  tab === "register"
                    ? "bg-[#c29b78] text-[#151413] shadow-md shadow-[#c29b78]/25"
                    : "text-[#a3a3a3] hover:text-[#f5f5f5]"
                }`}
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Create Account</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setTab("login");
                  setErrorMsg(null);
                }}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  tab === "login"
                    ? "bg-[#c29b78] text-[#151413] shadow-md shadow-[#c29b78]/25"
                    : "text-[#a3a3a3] hover:text-[#f5f5f5]"
                }`}
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Sign In</span>
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Google OAuth Quick Button */}
              <button
                type="button"
                disabled={isLoading}
                onClick={handleGoogleOAuthRedirect}
                className="w-full py-2.5 rounded-xl bg-[#22201e] hover:bg-[#282522] border border-white/10 text-white text-xs font-bold transition-[transform,background-color] duration-150 ease-out shadow-sm cursor-pointer flex items-center justify-center gap-2.5 active:scale-[0.97]"
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                <span>{isLoading ? "Connecting to Google..." : "Continue with Google"}</span>
              </button>

              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-white/10" />
                <span className="text-[10px] uppercase font-bold text-[#a3a3a3] tracking-wider">
                  or with password
                </span>
                <div className="flex-1 h-px bg-white/10" />
              </div>

              {tab === "register" ? (
                <form onSubmit={handleRegister} className="space-y-3.5">
                  {/* Locked Verified Placement Rating Badge */}
                  <div className="p-3.5 rounded-xl bg-[#22201e]/60 border border-[#c29b78]/30 flex items-center justify-between shadow-sm">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-[#c29b78]/10 border border-[#c29b78]/30 flex items-center justify-center text-[#c29b78] shrink-0">
                        <ShieldCheck className="w-4 h-4 stroke-[2]" />
                      </div>
                      <div>
                        <div className="text-[10px] uppercase font-bold text-[#a3a3a3] tracking-wider">
                          Placement Baseline
                        </div>
                        <div className="text-xs font-semibold text-[#f5f5f5]">
                          {isCalibrated ? "Verified Placement Rating" : "Adaptive Baseline"}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-baseline gap-1 font-mono">
                      <span className="text-base font-bold text-[#c29b78]">{calibratedElo}</span>
                      <span className="text-[10px] text-[#a3a3a3]">ELO</span>
                    </div>
                  </div>

                  {/* Display Picture Preview & Upload Trigger */}
                  <div>
                    <label className="text-[11px] font-bold uppercase tracking-wider text-[#a3a3a3] block mb-1.5">
                      Display Picture
                    </label>
                    <input
                      type="file"
                      ref={fileInputRef}
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      className="hidden"
                    />
                    <div className="flex flex-col items-center justify-center p-3.5 bg-[#22201e] rounded-xl border border-white/10 gap-2.5">
                      <div className="w-16 h-16 rounded-full overflow-hidden shadow-lg border-2 border-[#c29b78]/40 flex items-center justify-center">
                        <UserAvatar
                          avatar={selectedAvatar}
                          username={username || "Player"}
                          name={displayName}
                          email={email}
                          className="w-full h-full text-xl font-black"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          disabled={isUploadingPhoto}
                          onClick={() => fileInputRef.current?.click()}
                          className="py-1.5 px-3 rounded-lg bg-gradient-to-r from-[#c29b78] to-[#d4b08f] text-[#151413] font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-md active:scale-98"
                        >
                          <Camera className="w-3.5 h-3.5 stroke-[2.5]" />
                          <span>{isUploadingPhoto ? "Processing..." : selectedAvatar ? "Change Photo" : "Upload Photo"}</span>
                        </button>
                        {selectedAvatar && (
                          <button
                            type="button"
                            onClick={() => setSelectedAvatar("")}
                            className="py-1.5 px-2.5 rounded-lg bg-[#151413] hover:bg-[#2d2a28] text-zinc-400 hover:text-red-400 font-bold text-xs border border-white/10 transition-colors cursor-pointer"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Name (Display Name) Input */}
                  <div>
                    <label
                      htmlFor="reg-display"
                      className="text-[11px] font-bold uppercase tracking-wider text-[#a3a3a3] block mb-1"
                    >
                      Name
                    </label>
                    <input
                      id="reg-display"
                      type="text"
                      placeholder="e.g. Master Alexander"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-[#22201e] border border-white/10 text-white text-xs placeholder:text-neutral-500 focus:outline-none focus:border-[#c29b78] transition-colors"
                      maxLength={30}
                      autoComplete="name"
                    />
                  </div>

                  {/* Email Input */}
                  <div>
                    <label
                      htmlFor="reg-email"
                      className="text-[11px] font-bold uppercase tracking-wider text-[#a3a3a3] block mb-1"
                    >
                      Email (validate email)
                    </label>
                    <input
                      id="reg-email"
                      type="email"
                      placeholder="e.g. alexander@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-[#22201e] border border-white/10 text-white text-xs placeholder:text-neutral-500 focus:outline-none focus:border-[#c29b78] transition-colors"
                      autoCapitalize="none"
                      autoComplete="email"
                    />
                  </div>

                  {/* Username Input */}
                  <div>
                    <label
                      htmlFor="reg-username"
                      className="text-[11px] font-bold uppercase tracking-wider text-[#a3a3a3] block mb-1"
                    >
                      Username *
                    </label>
                    <input
                      id="reg-username"
                      type="text"
                      placeholder="e.g. tactics_master"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-[#22201e] border border-white/10 text-white text-xs placeholder:text-neutral-500 focus:outline-none focus:border-[#c29b78] transition-colors"
                      maxLength={20}
                      autoCapitalize="none"
                      autoComplete="username"
                      required
                    />
                  </div>

                  {/* Password Input (Required) */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label
                        htmlFor="reg-password"
                        className="text-[11px] font-bold uppercase tracking-wider text-[#a3a3a3]"
                      >
                        Password * (min 6 characters)
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="text-[10px] text-[#c29b78] hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        {showPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                        <span>{showPassword ? "Hide" : "Show"}</span>
                      </button>
                    </div>
                    <div className="relative">
                      <input
                        id="reg-password"
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full pl-8 pr-3 py-2 rounded-xl bg-[#22201e] border border-white/10 text-white text-xs placeholder:text-neutral-500 focus:outline-none focus:border-[#c29b78] transition-colors"
                        minLength={6}
                        autoComplete="new-password"
                        required
                      />
                      <Lock className="w-3.5 h-3.5 text-[#a3a3a3] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>

                  {/* Confirm Password Input */}
                  <div>
                    <label
                      htmlFor="reg-confirm-password"
                      className="text-[11px] font-bold uppercase tracking-wider text-[#a3a3a3] block mb-1"
                    >
                      Confirm Pass *
                    </label>
                    <div className="relative">
                      <input
                        id="reg-confirm-password"
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full pl-8 pr-3 py-2 rounded-xl bg-[#22201e] border border-white/10 text-white text-xs placeholder:text-neutral-500 focus:outline-none focus:border-[#c29b78] transition-colors"
                        minLength={6}
                        autoComplete="new-password"
                      />
                      <Lock className="w-3.5 h-3.5 text-[#a3a3a3] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>

                  {/* Account Security Notice */}
                  <div className="p-2.5 rounded-xl bg-[#22201e] border border-white/10 flex items-start gap-2">
                    <ShieldCheck className="w-4 h-4 text-[#c29b78] shrink-0 mt-0.5" />
                    <p className="text-[11px] text-[#a3a3a3] leading-relaxed">
                      Secured with salt-hashed encryption. Your Elo, streaks, and subscription are permanently protected.
                    </p>
                  </div>

                  {errorMsg && (
                    <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-semibold">
                      {errorMsg}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3 rounded-xl bg-[#c29b78] hover:bg-[#d4b08f] disabled:opacity-50 text-[#151413] font-black text-xs uppercase tracking-wider transition-all cursor-pointer shadow-lg shadow-[#c29b78]/25 flex items-center justify-center gap-2 active:scale-98"
                  >
                    <span>{isLoading ? "Creating Account..." : "Create Account"}</span>
                    <ArrowRight className="w-4 h-4 stroke-[3]" />
                  </button>
                </form>
              ) : (
                <form onSubmit={handleLogin} className="space-y-3.5">
                  <div>
                    <label
                      htmlFor="login-username"
                      className="text-[11px] font-bold uppercase tracking-wider text-[#a3a3a3] block mb-1"
                    >
                      Username or Email
                    </label>
                    <input
                      id="login-username"
                      type="text"
                      placeholder="e.g. tactics_master or you@email.com"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-[#22201e] border border-white/10 text-white text-xs placeholder:text-neutral-500 focus:outline-none focus:border-[#c29b78] transition-colors"
                      maxLength={50}
                      autoComplete="username"
                      required
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label
                        htmlFor="login-password"
                        className="text-[11px] font-bold uppercase tracking-wider text-[#a3a3a3]"
                      >
                        Password
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="text-[10px] text-[#c29b78] hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        {showPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                        <span>{showPassword ? "Hide" : "Show"}</span>
                      </button>
                    </div>
                    <div className="relative">
                      <input
                        id="login-password"
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full pl-8 pr-3 py-2 rounded-xl bg-[#22201e] border border-white/10 text-white text-xs placeholder:text-neutral-500 focus:outline-none focus:border-[#c29b78] transition-colors"
                        autoComplete="current-password"
                        required
                      />
                      <Lock className="w-3.5 h-3.5 text-[#a3a3a3] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-[#22201e] border border-white/10 flex items-start gap-2">
                    <ShieldCheck className="w-4 h-4 text-[#c29b78] shrink-0 mt-0.5" />
                    <p className="text-[11px] text-[#a3a3a3] leading-relaxed">
                      Password verification required to protect user accounts, ratings, and active subscriptions.
                    </p>
                  </div>

                  {errorMsg && (
                    <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-semibold">
                      {errorMsg}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3 rounded-xl bg-[#c29b78] hover:bg-[#d4b08f] disabled:opacity-50 text-[#0f0e0d] font-black text-xs uppercase tracking-wider transition-[transform,background-color] duration-150 ease-out cursor-pointer shadow-lg shadow-[#c29b78]/25 flex items-center justify-center gap-2 active:scale-[0.97]"
                  >
                    <span>{isLoading ? "Signing In..." : "Sign In to DoomChess"}</span>
                    <LogIn className="w-4 h-4 stroke-[2.5]" />
                  </button>
                </form>
              )}
            </div>
          </div>
      </div>

      {otpState.isOpen && (
        <OtpModal
          isOpen={otpState.isOpen}
          onClose={() => setOtpState((prev) => ({ ...prev, isOpen: false }))}
          email={otpState.email}
          type={otpState.type}
          onEditDetails={() => setOtpState((prev) => ({ ...prev, isOpen: false }))}
          onSuccess={async (user) => {
            setOtpState((prev) => ({ ...prev, isOpen: false }));
            if (user?.id) {
              await syncGuestSessionToAccount(user.id).catch(() => {});
              clearGuestSession();
            }
            const currentGuest = getGuestSession();
            const safeUser = {
              ...user,
              isCalibrated: Boolean(user?.isCalibrated || currentGuest.isComplete || currentGuest.calibratedElo),
              elo: user?.elo || currentGuest.calibratedElo || calibratedElo,
            };
            onAccountSuccess(safeUser);
            onClose();
          }}
        />
      )}
    </div>
  );
}
