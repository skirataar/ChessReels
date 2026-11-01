"use client";

import React, { useState } from "react";
import { X, ArrowRight, LogIn, UserPlus, ShieldCheck, Check } from "lucide-react";

interface AuthModalProps {
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
  }) => void;
}

export type SkillLevel = "beginner" | "intermediate" | "advanced";

const AVATAR_OPTIONS = ["♟", "♞", "♝", "♜", "♛", "♚", "⚡", "🔥"];

const SKILL_OPTIONS: {
  id: SkillLevel;
  title: string;
  ratingLabel: string;
  baseElo: number;
  description: string;
  icon: string;
  accentColor: string;
}[] = [
  {
    id: "beginner",
    title: "Beginner",
    ratingLabel: "< 1000 Elo",
    baseElo: 600,
    description: "New to tactics, learning basic forks & pins",
    icon: "🌱",
    accentColor: "#4edea3",
  },
  {
    id: "intermediate",
    title: "Intermediate",
    ratingLabel: "1000 – 1500 Elo",
    baseElo: 1200,
    description: "Solid tactical foundations, skewers & discoveries",
    icon: "⚔️",
    accentColor: "#38bdf8",
  },
  {
    id: "advanced",
    title: "Advanced",
    ratingLabel: "1500+ Elo",
    baseElo: 1600,
    description: "Sharp calculation & multi-move deep combinations",
    icon: "👑",
    accentColor: "#c084fc",
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
  const [displayName, setDisplayName] = useState<string>("");
  const [selectedAvatar, setSelectedAvatar] = useState<string>("♟");
  const [selectedSkill, setSelectedSkill] = useState<SkillLevel>("intermediate");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [showGooglePrompt, setShowGooglePrompt] = useState<boolean>(initialShowGoogle);
  const [googleEmail, setGoogleEmail] = useState<string>("tactics.player@gmail.com");
  const [googleName, setGoogleName] = useState<string>("Tactics Master");

  if (!isOpen) return null;

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    const cleanUser = username.trim().toLowerCase();

    if (!cleanUser) {
      setErrorMsg("Please choose a username.");
      return;
    }

    if (!/^[a-z0-9_]{3,20}$/.test(cleanUser)) {
      setErrorMsg("Username must be 3-20 letters, numbers, or underscores.");
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
      setErrorMsg("Please enter your username.");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch("/api/user/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: cleanUser }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || "Could not sign in.");
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
      setErrorMsg("Connection error during Google Sign-In.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto">
      <div
        className="w-full max-w-md rounded-2xl bg-[#121214] border border-[#27272a] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 my-auto"
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-modal-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#27272a] bg-[#18181B]/80">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#4edea3]/10 border border-[#4edea3]/30 flex items-center justify-center text-[#4edea3] font-black text-sm">
              ♟
            </div>
            <div>
              <h2 id="auth-modal-title" className="text-base font-bold text-[#e5e1e4] tracking-tight">
                {tab === "register" ? "Create Account" : "Sign In"}
              </h2>
              <p className="text-[11px] text-[#bbcabf] font-medium">
                {tab === "register"
                  ? "Save your Elo permanently at the account level"
                  : "Welcome back to your tactical journey"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close modal"
            className="w-8 h-8 rounded-full flex items-center justify-center text-[#bbcabf] hover:text-white bg-[#201f21] hover:bg-[#2a2a2c] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Google Authentication Dialog Prompt (Simulated / One-Tap) */}
        {showGooglePrompt ? (
          <div className="p-5 space-y-4 bg-[#18181B]/90 animate-in fade-in duration-150">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10">
              <svg className="w-6 h-6 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <div>
                <p className="text-xs font-bold text-white">Sign in with Google to Chess Reel</p>
                <p className="text-[11px] text-[#bbcabf]">Sync your Elo securely across all sessions</p>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-[#bbcabf] block mb-1">
                  Google Email
                </label>
                <input
                  type="email"
                  value={googleEmail}
                  onChange={(e) => setGoogleEmail(e.target.value)}
                  placeholder="you@gmail.com"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#201f21] border border-[#27272a] text-white text-sm focus:outline-none focus:border-[#4edea3]"
                  required
                />
              </div>
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-[#bbcabf] block mb-1">
                  Display Name
                </label>
                <input
                  type="text"
                  value={googleName}
                  onChange={(e) => setGoogleName(e.target.value)}
                  placeholder="Your Name"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#201f21] border border-[#27272a] text-white text-sm focus:outline-none focus:border-[#4edea3]"
                  required
                />
              </div>

              {/* Skill Tier for New Google Users */}
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-[#bbcabf] block mb-1.5">
                  Select Your Skill Baseline
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {SKILL_OPTIONS.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setSelectedSkill(opt.id)}
                      className={`p-2 rounded-xl text-left border transition-all cursor-pointer ${
                        selectedSkill === opt.id
                          ? "bg-[#201f21] border-[#4edea3] shadow-sm"
                          : "bg-[#18181B] border-white/5 hover:border-white/20"
                      }`}
                    >
                      <div className="text-sm">{opt.icon}</div>
                      <div className="text-xs font-bold text-white">{opt.title}</div>
                      <div className="text-[10px] text-[#bbcabf] font-mono">{opt.baseElo} Elo</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {errorMsg && (
              <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-semibold">
                {errorMsg}
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowGooglePrompt(false)}
                className="w-1/3 py-2.5 rounded-xl bg-[#201f21] text-[#bbcabf] hover:text-white text-xs font-bold transition-colors cursor-pointer"
              >
                Back
              </button>
              <button
                type="button"
                disabled={isLoading}
                onClick={() => handleGoogleAuth(googleEmail, googleName)}
                className="w-2/3 py-2.5 rounded-xl bg-white hover:bg-neutral-200 text-neutral-900 text-xs font-bold transition-all shadow cursor-pointer flex items-center justify-center gap-2"
              >
                <span>{isLoading ? "Connecting..." : "Confirm & Continue"}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          <div>
            {/* Top Google Fast Action */}
            <div className="p-4 bg-[#18181B]/40 border-b border-[#27272a] space-y-3">
              <button
                type="button"
                onClick={() => setShowGooglePrompt(true)}
                className="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-neutral-100 text-neutral-900 font-bold text-xs uppercase tracking-wider transition-all cursor-pointer shadow-md flex items-center justify-center gap-3 active:scale-98"
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>Continue with Google</span>
              </button>

              <div className="flex items-center gap-2">
                <div className="flex-1 h-px bg-[#27272a]" />
                <span className="text-[10px] uppercase font-bold text-[#bbcabf] tracking-wider">
                  or with username
                </span>
                <div className="flex-1 h-px bg-[#27272a]" />
              </div>

              {/* Tab Toggle */}
              <div className="grid grid-cols-2 p-1 rounded-xl bg-[#201f21]">
                <button
                  type="button"
                  onClick={() => {
                    setTab("register");
                    setErrorMsg(null);
                  }}
                  className={`py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    tab === "register"
                      ? "bg-[#4edea3] text-[#002113] shadow-md"
                      : "text-[#bbcabf] hover:text-white"
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
                  className={`py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    tab === "login"
                      ? "bg-[#4edea3] text-[#002113] shadow-md"
                      : "text-[#bbcabf] hover:text-white"
                  }`}
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Sign In</span>
                </button>
              </div>
            </div>

            {/* Form Body */}
            <div className="p-5 max-h-[60vh] overflow-y-auto">
              {tab === "register" ? (
                <form onSubmit={handleRegister} className="space-y-4">
                  {/* Skill Tier Baseline Selector (Important User Requirement) */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-[#bbcabf]">
                        Choose Your Skill Level *
                      </label>
                      <span className="text-[10px] text-[#4edea3] font-semibold">
                        Gauges your initial baseline
                      </span>
                    </div>

                    <div className="grid grid-cols-1 gap-2">
                      {SKILL_OPTIONS.map((opt) => {
                        const isSelected = selectedSkill === opt.id;
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => setSelectedSkill(opt.id)}
                            className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-3 ${
                              isSelected
                                ? "bg-[#18181B] border-[#4edea3] ring-1 ring-[#4edea3]/40 shadow-lg"
                                : "bg-[#18181B]/60 border-white/5 hover:border-white/20"
                            }`}
                          >
                            <div className="w-9 h-9 rounded-lg bg-[#201f21] flex items-center justify-center text-lg shrink-0">
                              {opt.icon}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-white">
                                  {opt.title}
                                </span>
                                <span
                                  className="text-[11px] font-mono font-bold px-1.5 py-0.5 rounded bg-white/5"
                                  style={{ color: opt.accentColor }}
                                >
                                  {opt.ratingLabel}
                                </span>
                              </div>
                              <p className="text-[10px] text-[#bbcabf] mt-0.5 line-clamp-1">
                                {opt.description}
                              </p>
                            </div>
                            {isSelected && (
                              <div className="w-5 h-5 rounded-full bg-[#4edea3] flex items-center justify-center text-[#002113] shrink-0">
                                <Check className="w-3 h-3 stroke-[3]" />
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Avatar Selector */}
                  <div>
                    <label className="text-[11px] font-bold uppercase tracking-wider text-[#bbcabf] block mb-2">
                      Choose Avatar
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                      {AVATAR_OPTIONS.map((item) => (
                        <button
                          key={item}
                          type="button"
                          onClick={() => setSelectedAvatar(item)}
                          className={`h-10 rounded-xl text-lg flex items-center justify-center transition-all cursor-pointer ${
                            selectedAvatar === item
                              ? "bg-[#4edea3]/20 border-2 border-[#4edea3] text-white scale-105 shadow-[0_0_12px_rgba(78,222,163,0.3)]"
                              : "bg-[#18181B] border border-white/5 text-[#bbcabf] hover:border-white/20"
                          }`}
                        >
                          {item}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Username Input */}
                  <div>
                    <label
                      htmlFor="reg-username"
                      className="text-[11px] font-bold uppercase tracking-wider text-[#bbcabf] block mb-1.5"
                    >
                      Username *
                    </label>
                    <input
                      id="reg-username"
                      type="text"
                      placeholder="e.g. tactics_king"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#18181B] border border-[#27272a] text-white text-sm placeholder:text-neutral-600 focus:outline-none focus:border-[#4edea3] transition-colors"
                      maxLength={20}
                      autoComplete="username"
                      required
                    />
                  </div>

                  {/* Display Name Input */}
                  <div>
                    <label
                      htmlFor="reg-display"
                      className="text-[11px] font-bold uppercase tracking-wider text-[#bbcabf] block mb-1.5"
                    >
                      Display Name (Optional)
                    </label>
                    <input
                      id="reg-display"
                      type="text"
                      placeholder="e.g. Master Alexander"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#18181B] border border-[#27272a] text-white text-sm placeholder:text-neutral-600 focus:outline-none focus:border-[#4edea3] transition-colors"
                      maxLength={30}
                    />
                  </div>

                  {/* Account Elo Guarantee Callout */}
                  <div className="p-3 rounded-xl bg-[#18181B] border border-white/10 flex items-start gap-2.5">
                    <ShieldCheck className="w-4 h-4 text-[#4edea3] shrink-0 mt-0.5" />
                    <p className="text-[11px] text-[#bbcabf] leading-relaxed">
                      Elo is permanently saved at the <strong className="text-white">account level</strong>. Starting rating is gauged from your skill selection above followed by a quick 6-puzzle placement test.
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
                    className="w-full py-3 rounded-xl bg-[#4edea3] hover:bg-[#10b981] disabled:opacity-50 text-[#002113] font-bold text-xs uppercase tracking-wider transition-all cursor-pointer shadow-lg flex items-center justify-center gap-2 active:scale-98"
                  >
                    <span>{isLoading ? "Creating..." : "Start 6-Puzzle Placement"}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </form>
              ) : (
                <form onSubmit={handleLogin} className="space-y-4">
                  <div>
                    <label
                      htmlFor="login-username"
                      className="text-[11px] font-bold uppercase tracking-wider text-[#bbcabf] block mb-1.5"
                    >
                      Enter Username
                    </label>
                    <input
                      id="login-username"
                      type="text"
                      placeholder="e.g. tactics_king"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#18181B] border border-[#27272a] text-white text-sm placeholder:text-neutral-600 focus:outline-none focus:border-[#4edea3] transition-colors"
                      maxLength={20}
                      autoComplete="username"
                      required
                    />
                  </div>

                  <div className="p-3 rounded-xl bg-[#18181B] border border-white/10 flex items-start gap-2.5">
                    <ShieldCheck className="w-4 h-4 text-[#38bdf8] shrink-0 mt-0.5" />
                    <p className="text-[11px] text-[#bbcabf] leading-relaxed">
                      Signing in restores your saved Elo, streak records, and friend rankings.
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
                    className="w-full py-3 rounded-xl bg-[#4edea3] hover:bg-[#10b981] disabled:opacity-50 text-[#002113] font-bold text-xs uppercase tracking-wider transition-all cursor-pointer shadow-lg flex items-center justify-center gap-2 active:scale-98"
                  >
                    <span>{isLoading ? "Signing In..." : "Sign In"}</span>
                    <LogIn className="w-4 h-4" />
                  </button>
                </form>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
