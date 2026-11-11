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
import { CURATED_AVATARS, compressImageFile } from "@/lib/avatarUpload";
import { OtpModal } from "@/components/OtpModal";

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

const SKILL_OPTIONS: {
  id: SkillLevel;
  title: string;
  ratingLabel: string;
  baseElo: number;
  description: string;
}[] = [
  {
    id: "beginner",
    title: "Beginner",
    ratingLabel: "< 1000 Elo",
    baseElo: 600,
    description: "New to tactics, learning basic forks & pins",
  },
  {
    id: "intermediate",
    title: "Intermediate",
    ratingLabel: "1000 – 1500 Elo",
    baseElo: 1200,
    description: "Solid tactical foundations & discoveries",
  },
  {
    id: "advanced",
    title: "Advanced",
    ratingLabel: "1500+ Elo",
    baseElo: 1600,
    description: "Sharp calculation & deep combinations",
  },
];

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
  const [selectedAvatar, setSelectedAvatar] = useState<string>(CURATED_AVATARS[0].url);
  const [selectedSkill, setSelectedSkill] = useState<SkillLevel>("intermediate");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState<boolean>(false);
  const [showGooglePrompt, setShowGooglePrompt] = useState<boolean>(initialShowGoogle);
  const [googleEmail, setGoogleEmail] = useState<string>("tactics.player@gmail.com");
  const [googleName, setGoogleName] = useState<string>("Tactics Master");
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
          skillLevel: selectedSkill,
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

      onAccountSuccess(data.user);
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
      const res = await fetch("/api/user/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: cleanUser,
          password,
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

      onAccountSuccess(data.user);
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
      typeof window !== "undefined" ? window.location.pathname : "/"
    );
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.href = `/api/auth/google?skillLevel=${selectedSkill}&guestId=${encodeURIComponent(guestId)}&returnUrl=${returnUrl}`;
  };

  const handleGoogleAuth = async (emailToUse: string, nameToUse: string) => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/user/google-auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: emailToUse,
          name: nameToUse,
          skillLevel: selectedSkill,
          avatar: selectedAvatar,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || "Google authentication failed.");
        setIsLoading(false);
        return;
      }

      onAccountSuccess(data.user);
      setShowGooglePrompt(false);
      onClose();
    } catch {
      setErrorMsg("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
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

        {/* Google Authentication Dialog Prompt */}
        {showGooglePrompt ? (
          <div className="p-5 space-y-4 bg-[#151413] overflow-y-auto">
            <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-[#22201e] border border-white/10 shadow-sm">
              <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              <div>
                <p className="text-xs font-bold text-[#f5f5f5]">Sign in with Google</p>
                <p className="text-[11px] text-[#a3a3a3]">Save your rating, streaks, and progress securely</p>
              </div>
            </div>

            {/* Skill Baseline for New Google Users */}
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-[#a3a3a3] block mb-1.5">
                Select Your Skill Baseline
              </label>
              <div className="grid grid-cols-3 gap-2">
                {SKILL_OPTIONS.map((opt) => {
                  const isSelected = selectedSkill === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setSelectedSkill(opt.id)}
                      className={`p-3 rounded-xl text-center border transition-all cursor-pointer ${
                        isSelected
                          ? "bg-[#282420] border-[#c29b78] shadow-sm shadow-[#c29b78]/25 ring-1 ring-[#c29b78]/40"
                          : "bg-[#22201e]/60 border-white/5 hover:border-white/20"
                      }`}
                    >
                      <div className="text-xs font-bold text-[#f5f5f5] mb-0.5">{opt.title}</div>
                      <div className="text-[11px] text-[#c29b78] font-mono font-semibold">{opt.baseElo} Elo</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Primary Google Button */}
            <button
              type="button"
              disabled={isLoading}
              onClick={handleGoogleOAuthRedirect}
              className="w-full py-3 rounded-xl bg-white hover:bg-neutral-100 text-neutral-900 text-xs font-bold transition-all shadow-md cursor-pointer flex items-center justify-center gap-2.5 active:scale-98"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              <span>{isLoading ? "Redirecting..." : "Continue with Google"}</span>
              <ArrowRight className="w-4 h-4 text-neutral-700" />
            </button>

            {/* Quick Test Sign-In */}
            <div className="pt-3 border-t border-white/10 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold text-[#a3a3a3] tracking-wider">
                  Quick Direct Sign-In
                </span>
                <span className="text-[10px] text-[#c29b78]">Instant Sync</span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-[#a3a3a3] block mb-1">
                    Google Email
                  </label>
                  <input
                    type="email"
                    value={googleEmail}
                    onChange={(e) => setGoogleEmail(e.target.value)}
                    placeholder="you@gmail.com"
                    className="w-full px-3 py-2 rounded-xl bg-[#22201e] border border-white/10 text-white text-xs focus:outline-none focus:border-[#c29b78]"
                    required
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-[#a3a3a3] block mb-1">
                    Display Name
                  </label>
                  <input
                    type="text"
                    value={googleName}
                    onChange={(e) => setGoogleName(e.target.value)}
                    placeholder="Tactics Master"
                    className="w-full px-3 py-2 rounded-xl bg-[#22201e] border border-white/10 text-white text-xs focus:outline-none focus:border-[#c29b78]"
                    required
                  />
                </div>
              </div>

              {errorMsg && (
                <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-semibold">
                  {errorMsg}
                </div>
              )}

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowGooglePrompt(false)}
                  className="flex-1 py-2.5 rounded-xl bg-[#22201e] hover:bg-[#2d2a28] text-[#a3a3a3] hover:text-white text-xs font-bold transition-all cursor-pointer"
                >
                  Back
                </button>
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={() => handleGoogleAuth(googleEmail, googleName)}
                  className="flex-[2] py-2.5 rounded-xl bg-[#c29b78] hover:bg-[#d4b08f] text-[#151413] text-xs font-black uppercase tracking-wider transition-all cursor-pointer shadow-md flex items-center justify-center gap-1.5"
                >
                  <span>{isLoading ? "Signing in..." : "Confirm & Continue"}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        ) : (
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
                  {/* Skill Baseline Selection */}
                  <div>
                    <label className="text-[11px] font-bold uppercase tracking-wider text-[#a3a3a3] block mb-1.5">
                      Choose Your Skill Level
                    </label>
                    <div className="space-y-1.5">
                      {SKILL_OPTIONS.map((opt) => {
                        const isSelected = selectedSkill === opt.id;
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => setSelectedSkill(opt.id)}
                            className={`w-full p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-3 ${
                              isSelected
                                ? "bg-[#22201e] border-[#c29b78] ring-1 ring-[#c29b78]/40 shadow-md"
                                : "bg-[#22201e]/60 border-white/5 hover:border-white/20"
                            }`}
                          >
                            <div className="w-8 h-8 rounded-lg bg-[#151413] border border-white/5 flex items-center justify-center shrink-0">
                              {opt.id === "beginner" ? (
                                <Target className="w-4 h-4 text-[#a3a3a3]" />
                              ) : opt.id === "intermediate" ? (
                                <Zap className="w-4 h-4 text-[#c29b78]" />
                              ) : (
                                <Trophy className="w-4 h-4 text-[#e5ba82]" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-[#f5f5f5]">
                                  {opt.title}
                                </span>
                                <span className="text-[11px] font-mono font-bold px-1.5 py-0.5 rounded bg-white/5 text-[#c29b78]">
                                  {opt.ratingLabel}
                                </span>
                              </div>
                              <p className="text-[10px] text-[#a3a3a3] line-clamp-1">
                                {opt.description}
                              </p>
                            </div>
                            {isSelected && (
                              <div className="w-4 h-4 rounded-full bg-[#c29b78] flex items-center justify-center text-[#151413] shrink-0">
                                <Check className="w-3 h-3 stroke-[3]" />
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Display Picture Selector */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-[#a3a3a3]">
                        Display Picture
                      </label>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="text-[10px] text-[#c29b78] hover:underline font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <Camera className="w-3 h-3" />
                        <span>{isUploadingPhoto ? "Processing..." : "Upload Photo"}</span>
                      </button>
                    </div>

                    <input
                      type="file"
                      ref={fileInputRef}
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      className="hidden"
                    />

                    {/* Curated Modern Chess Photography Presets */}
                    <div className="grid grid-cols-4 gap-2">
                      {CURATED_AVATARS.map((item) => {
                        const isSelected = selectedAvatar === item.url;
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => setSelectedAvatar(item.url)}
                            className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-all cursor-pointer group ${
                              isSelected
                                ? "border-[#c29b78] ring-2 ring-[#c29b78]/40 scale-102"
                                : "border-white/10 hover:border-[#c29b78]/50"
                            }`}
                            title={item.name}
                          >
                            <img
                              src={item.url}
                              alt={item.name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            />
                            {isSelected && (
                              <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-[#c29b78] text-[#151413] flex items-center justify-center shadow-md">
                                <Check className="w-2.5 h-2.5 stroke-[3]" />
                              </div>
                            )}
                            <span className="absolute bottom-0 inset-x-0 bg-black/75 text-[8px] font-bold text-white py-0.5 truncate px-1 text-center">
                              {item.name}
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Custom uploaded photo preview */}
                    {selectedAvatar.startsWith("data:image/") && (
                      <div className="mt-2 p-2 rounded-xl bg-[#22201e] border border-[#c29b78]/40 flex items-center gap-2.5">
                        <img
                          src={selectedAvatar}
                          alt="Custom Photo"
                          className="w-8 h-8 rounded-lg object-cover border border-[#c29b78]"
                        />
                        <span className="text-[11px] text-[#c29b78] font-bold flex items-center gap-1">
                          <Check className="w-3.5 h-3.5" />
                          Custom Photo Selected
                        </span>
                      </div>
                    )}
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
                    <span>{isLoading ? "Creating Account..." : "Create Account & Start Placement"}</span>
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
              {/* Developer / Offline Quick Test Sign-In Option */}
              <div className="pt-1 text-center">
                <button
                  type="button"
                  onClick={() => setShowGooglePrompt(true)}
                  className="text-[10px] text-[#737373] hover:text-[#c29b78] transition-colors cursor-pointer"
                >
                  Quick Test Sign-In (without Google)
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {otpState.isOpen && (
        <OtpModal
          isOpen={otpState.isOpen}
          onClose={() => setOtpState((prev) => ({ ...prev, isOpen: false }))}
          email={otpState.email}
          type={otpState.type}
          onSuccess={(user) => {
            setOtpState((prev) => ({ ...prev, isOpen: false }));
            onAccountSuccess(user);
            onClose();
          }}
        />
      )}
    </div>
  );
}
