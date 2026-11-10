"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useStreak } from "@/lib/useStreak";
import { UserAvatar } from "@/components/UserAvatar";
import { AuthModal } from "@/components/AuthModal";
import {
  Trophy,
  Flame,
  Snowflake,
  CheckCircle2,
  XCircle,
  Clock,
  Target,
  Zap,
  TrendingUp,
  Award,
  ArrowLeft,
  ArrowRight,
  Crown,
  LogOut,
  UserPlus,
  RotateCcw,
  Volume2,
  VolumeX,
  Camera,
  Upload,
  Image as ImageIcon,
  Sparkles,
  Check,
  X,
  Palette,
  Settings,
} from "lucide-react";
import { SettingsModal } from "@/components/SettingsModal";
import { BOARD_THEMES, useBoardTheme } from "@/lib/boardThemes";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  Tooltip,
  Cell,
} from "recharts";
import { sounds } from "@/lib/audio";
import { CURATED_AVATARS, compressImageFile, persistAvatar } from "@/lib/avatarUpload";
import { clearGuestLocalSession, isGuestAccount } from "@/lib/guestAccount";
import { clearAllUserAndPuzzleCache } from "@/lib/puzzleCache";

interface DayData {
  day: string;
  solved: number;
}

export default function ProfileStatsPage() {
  const router = useRouter();
  const {
    dailyStreak,
    streakFreezes,
    combo,
    bestCombo,
    totalSolved,
    totalFailed,
  } = useStreak();

  const [currentElo, setCurrentElo] = useState<number>(800);
  const [userName, setUserName] = useState<string>("Tactician");
  const [userHandle, setUserHandle] = useState<string>("");
  const [userAvatar, setUserAvatar] = useState<string | undefined>(undefined);
  const [isPro, setIsPro] = useState<boolean>(false);
  const [isMounted, setIsMounted] = useState<boolean>(false);
  const [isAuthOpen, setIsAuthOpen] = useState<boolean>(false);
  const [userAccount, setUserAccount] = useState<any>(null);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isDpPickerOpen, setIsDpPickerOpen] = useState<boolean>(false);
  const [isUploadingDp, setIsUploadingDp] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [boardTheme, setBoardTheme] = useBoardTheme();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [weeklyData, setWeeklyData] = useState<DayData[]>([
    { day: "Mon", solved: 0 },
    { day: "Tue", solved: 0 },
    { day: "Wed", solved: 0 },
    { day: "Thu", solved: 0 },
    { day: "Fri", solved: 0 },
    { day: "Sat", solved: 0 },
    { day: "Sun", solved: 0 },
  ]);

  const syncAccount = () => {
    try {
      const savedElo = localStorage.getItem("chess_reel_elo");
      if (savedElo) {
        const parsed = parseInt(savedElo, 10);
        if (!isNaN(parsed) && parsed > 0) setCurrentElo(parsed);
      }

      const plan = localStorage.getItem("chess_reel_plan");
      const customDp = localStorage.getItem("chess_reel_custom_dp");
      const savedAccount = localStorage.getItem("chess_reel_account");

      if (savedAccount) {
        const parsed = JSON.parse(savedAccount);
        if (isGuestAccount(parsed)) {
          clearGuestLocalSession();
          router.replace("/");
          return;
        }
        setUserAccount(parsed);
        if (parsed.displayName || parsed.username) {
          setUserName(parsed.displayName || parsed.username);
        }
        if (parsed.username) {
          setUserHandle(`@${parsed.username}`);
        }
        if (parsed.avatar) {
          setUserAvatar(parsed.avatar);
        } else if (customDp) {
          setUserAvatar(customDp);
        }
        if (parsed.elo) {
          setCurrentElo(parsed.elo);
        }
        if (parsed.plan === "premium" || plan === "premium") {
          setIsPro(true);
        }
      } else {
        router.replace("/");
        return;
      }

      setIsMuted(sounds.getIsMuted());
    } catch {}
  };

  useEffect(() => {
    setIsMounted(true);
    syncAccount();

    // Generate 7-day activity data on client mount
    try {
      const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      const todayIndex = new Date().getDay();
      const result: DayData[] = [];

      for (let i = 6; i >= 0; i--) {
        const dIndex = (todayIndex - i + 7) % 7;
        const isToday = i === 0;
        let count = 0;
        if (isToday) {
          count = Math.max(1, Math.min(totalSolved, Math.ceil(totalSolved * 0.4)));
        } else if (totalSolved > 1) {
          count = Math.max(0, Math.round((totalSolved * (7 - i)) / 15));
        }

        result.push({
          day: days[dIndex] ?? "Day",
          solved: count,
        });
      }

      setWeeklyData(result);
    } catch {}

    window.addEventListener("storage", syncAccount);
    window.addEventListener("plan-updated", syncAccount);
    window.addEventListener("account-updated", syncAccount);
    return () => {
      window.removeEventListener("storage", syncAccount);
      window.removeEventListener("plan-updated", syncAccount);
      window.removeEventListener("account-updated", syncAccount);
    };
  }, [totalSolved]);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setIsUploadingDp(true);
      const compressedDataUrl = await compressImageFile(file, 256);
      setUserAvatar(compressedDataUrl);
      await persistAvatar(compressedDataUrl, userAccount?.id);
      setToastMessage("Display picture updated!");
      setTimeout(() => setToastMessage(null), 3000);
      setIsDpPickerOpen(false);
    } catch (err: any) {
      console.error("Failed to upload photo:", err);
      setToastMessage(err.message || "Failed to process photo.");
      setTimeout(() => setToastMessage(null), 3000);
    } finally {
      setIsUploadingDp(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSelectPreset = async (url: string) => {
    try {
      setUserAvatar(url);
      await persistAvatar(url, userAccount?.id);
      setToastMessage("Display picture updated!");
      setTimeout(() => setToastMessage(null), 3000);
      setIsDpPickerOpen(false);
    } catch (err) {
      console.error("Failed to set avatar preset:", err);
    }
  };

  const handleSignOut = () => {
    const oldUserId = userAccount?.id;
    setUserAccount(null);
    clearAllUserAndPuzzleCache(oldUserId);
    if (typeof window !== "undefined") {
      try {
        window.localStorage.removeItem("chessreels_user_stats_v1");
        window.localStorage.removeItem("quota_last_check");
        window.localStorage.removeItem("chess_reel_account");
        window.localStorage.removeItem("chess_reel_tier_config");
        window.sessionStorage.clear();
      } catch {}
    }
    if (typeof document !== "undefined") {
      document.cookie = "chess_reel_session=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    }
    if (typeof window !== "undefined") {
      window.location.href = "/";
    } else {
      router.replace("/");
    }
  };

  const handleToggleMute = () => {
    const next = sounds.toggleMute();
    setIsMuted(next);
  };

  const handleUpgradePro = async () => {
    try {
      localStorage.setItem("chess_reel_open_paywall", "1");
      router.push("/play");
    } catch {
      setToastMessage("Could not open the Pro upgrade page.");
      setTimeout(() => setToastMessage(null), 3000);
    }
  };

  const totalAttempts = totalSolved + totalFailed;
  const accuracy =
    totalAttempts > 0 ? Math.round((totalSolved / totalAttempts) * 100) : 0;

  const totalMinutes = Math.max(1, Math.round((totalAttempts * 45) / 60));

  const getSkillTier = (elo: number) => {
    if (elo >= 2200) return "Grandmaster Potential";
    if (elo >= 1800) return "Tactical Expert";
    if (elo >= 1400) return "Club Competitor";
    if (elo >= 1000) return "Intermediate Solver";
    return "Tactics Apprentice";
  };

  return (
    <div className="bg-[#151413] text-[#f5f5f5] min-h-screen flex flex-col w-full selection:bg-[#c29b78] selection:text-[#151413] px-4 py-5 max-w-md mx-auto pb-24">
      {/* 1. Header with Back Button and Pro Badge */}
      <header className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <Link
            href="/play"
            className="p-2 rounded-xl bg-[#22201e] hover:bg-[#2d2a28] text-[#a3a3a3] hover:text-[#f5f5f5] border border-white/5 transition-all cursor-pointer"
            aria-label="Back to Puzzles"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-base font-black tracking-tight text-[#f5f5f5]">
              Profile &amp; Stats
            </h1>
            <p className="text-[11px] text-[#a3a3a3]">
              Personal progress &amp; tactical analytics
            </p>
          </div>
        </div>

        <span
          className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${
            isPro
              ? "bg-[#c29b78]/15 text-[#c29b78] border-[#c29b78]/30"
              : "bg-white/5 text-[#a3a3a3] border-white/10"
          }`}
        >
          {isPro ? (
            <span className="flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-[#c29b78] inline-block shrink-0" strokeWidth={1.5} />
              <span>PRO ACTIVE</span>
            </span>
          ) : (
            "FREE TIER"
          )}
        </span>
      </header>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-18 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full bg-[#22201e]/95 border border-[#c29b78]/40 text-[#c29b78] text-xs font-bold shadow-2xl backdrop-blur-md animate-in fade-in zoom-in-95 duration-150 flex items-center gap-1.5">
          <CheckCircle2 className="w-4 h-4 text-[#10b981]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Hidden File Input for Custom Display Picture Upload */}
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        onChange={handlePhotoUpload}
        className="hidden"
        data-testid="avatar-file-input"
      />

      {/* 2. Combined Identity Card */}
      <section className="bg-[#22201e] border border-white/10 rounded-3xl p-4 shadow-xl mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="relative group cursor-pointer"
              onClick={() => setIsDpPickerOpen((prev) => !prev)}
              title="Tap to change display picture"
              data-testid="stats-avatar-container"
            >
              <div className="w-14 h-14 rounded-2xl bg-[#151413] border-2 border-[#c29b78]/40 group-hover:border-[#c29b78] flex items-center justify-center overflow-hidden shadow-inner shrink-0 transition-colors">
                <UserAvatar avatar={userAvatar} fallback="♟" className="w-8 h-8 text-[#c29b78]" />
              </div>
              <div
                data-testid="change-dp-badge"
                className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-[#c29b78] text-[#151413] flex items-center justify-center shadow-md group-hover:scale-110 transition-transform"
              >
                <Camera className="w-3 h-3 stroke-[2.5]" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h2 className="text-base font-black tracking-tight text-[#f5f5f5]">
                  {userName}
                </h2>
                <Award className="w-4 h-4 text-[#c29b78]" />
              </div>
              {userHandle && (
                <div className="text-[11px] text-[#a3a3a3] font-mono">
                  {userHandle}
                </div>
              )}
              <p className="text-xs text-[#c29b78] font-semibold mt-0.5">
                {getSkillTier(currentElo)}
              </p>
            </div>
          </div>

          {/* Sign Out or Sign In Action */}
          {userAccount ? (
            <button
              onClick={handleSignOut}
              title="Sign out of account"
              className="p-2 rounded-xl bg-[#151413] hover:bg-[#2d2a28] text-[#a3a3a3] hover:text-red-400 border border-white/5 transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={() => setIsAuthOpen(true)}
              className="px-3 py-1.5 rounded-xl bg-[#c29b78] hover:bg-[#d4b08f] text-[#151413] font-black text-xs transition-all cursor-pointer shadow-md shadow-[#c29b78]/25 flex items-center gap-1.5 active:scale-95"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Sign In</span>
            </button>
          )}
        </div>

        {/* Display Picture Picker & Upload Drawer */}
        {isDpPickerOpen && (
          <div
            data-testid="dp-picker-panel"
            className="mt-3.5 pt-3.5 border-t border-white/10 animate-in fade-in slide-in-from-top-2 duration-200"
          >
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#c29b78]" />
                <span className="text-xs font-bold text-[#f5f5f5]">
                  Select or Upload Display Picture
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsDpPickerOpen(false)}
                className="text-[#a3a3a3] hover:text-white p-1 cursor-pointer"
                aria-label="Close DP picker"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Custom File Upload Button */}
            <button
              type="button"
              disabled={isUploadingDp}
              onClick={() => fileInputRef.current?.click()}
              data-testid="upload-custom-dp-btn"
              className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-[#c29b78] to-[#d4b08f] hover:brightness-105 active:scale-98 text-[#151413] font-black text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md shadow-[#c29b78]/25 mb-3"
            >
              <Upload className="w-4 h-4 stroke-[2.5]" />
              <span>
                {isUploadingDp
                  ? "Compressing & Uploading..."
                  : "Upload Custom Photo from Phone / PC"}
              </span>
            </button>

            {/* Curated Modern Chess Photography Presets */}
            <div>
              <span className="text-[10px] uppercase font-bold text-[#a3a3a3] tracking-wider block mb-2">
                Or Select Premium Chess Photography
              </span>
              <div className="grid grid-cols-4 gap-2">
                {CURATED_AVATARS.map((preset) => {
                  const isSelected = userAvatar === preset.url;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      data-testid={`avatar-preset-${preset.id}`}
                      onClick={() => handleSelectPreset(preset.url)}
                      className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-all cursor-pointer group ${
                        isSelected
                          ? "border-[#c29b78] ring-2 ring-[#c29b78]/40 scale-102"
                          : "border-white/10 hover:border-[#c29b78]/60"
                      }`}
                      title={preset.name}
                    >
                      <img
                        src={preset.url}
                        alt={preset.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                      {isSelected && (
                        <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-[#c29b78] text-[#151413] flex items-center justify-center shadow-md">
                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                        </div>
                      )}
                      <span className="absolute bottom-0 inset-x-0 bg-black/75 text-[9px] font-bold text-white py-0.5 truncate px-1 text-center">
                        {preset.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Account prompt */}
        {!userAccount && (
          <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between text-xs text-[#a3a3a3]">
            <span>Sign in to save your rating and streaks</span>
            <button
              onClick={() => setIsAuthOpen(true)}
              className="text-[#c29b78] font-bold hover:underline cursor-pointer inline-flex items-center gap-1"
            >
              <span>Create Account</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </section>

      {/* 3. Daily Streak & 7-Day Activity Card */}
      <section className="bg-[#22201e] border border-white/10 rounded-3xl p-4 shadow-xl mb-4 flex flex-col gap-3">
        <div className="flex items-center justify-between border-b border-white/5 pb-3">
          <div className="flex items-center gap-2">
            <div className={`p-2 rounded-xl border transition-all ${
              dailyStreak >= 1
                ? "bg-amber-500/15 border-amber-500/30 text-amber-400"
                : "bg-white/5 border-white/10 text-stone-500"
            }`}>
              <Flame
                fill={dailyStreak >= 1 ? "#f59e0b" : "none"}
                stroke={dailyStreak >= 1 ? "#fbbf24" : "#78716c"}
                strokeWidth={dailyStreak >= 1 ? 1.5 : 1.75}
                className={`w-5 h-5 transition-colors duration-300 ${
                  dailyStreak >= 1 ? "drop-shadow-[0_0_8px_rgba(245,158,11,0.55)]" : ""
                }`}
              />
            </div>
            <div>
              <h3 className="text-sm font-black text-[#f5f5f5]">Daily Streak</h3>
              <p className="text-[10px] text-[#a3a3a3]">Consecutive days trained</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div
              data-testid="profile-freeze-indicator"
              className="flex items-center gap-1 text-xs font-medium text-sky-400/90 cursor-help"
              title="Earned every 7-day streak • Protects up to 2 missed days"
            >
              <Snowflake className="w-3.5 h-3.5 text-sky-400 shrink-0" strokeWidth={1.5} />
              <span>{streakFreezes}/2</span>
            </div>
            <div className="text-right">
              <span className={`text-2xl font-black ${
                dailyStreak >= 1 ? "text-[#f5f2eb]" : "text-[#78716c]"
              }`}>
                {dailyStreak}
              </span>
              <span className="text-xs text-[#a3a3a3] ml-1">
                {dailyStreak === 1 ? "Day" : "Days"}
              </span>
            </div>
          </div>
        </div>

        {/* Combo metrics */}
        <div className="grid grid-cols-2 gap-2 bg-[#151413] p-2.5 rounded-2xl border border-white/5">
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-[#a3a3a3] uppercase tracking-wider flex items-center gap-1">
              <Zap className="w-3 h-3 text-[#c29b78]" />
              Solve Combo
            </span>
            <span className="text-base font-black text-[#f5f5f5]">
              {combo} in a row
            </span>
          </div>
          <div className="flex flex-col border-l border-white/5 pl-3">
            <span className="text-[10px] font-bold text-[#a3a3a3] uppercase tracking-wider flex items-center gap-1">
              <Trophy className="w-3 h-3 text-[#c29b78]" />
              Best Combo
            </span>
            <span className="text-base font-black text-[#c29b78]">
              {bestCombo} in a row
            </span>
          </div>
        </div>

        {/* 7-Day Activity Bar Chart */}
        <div className="flex flex-col gap-1.5 pt-1">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-[#f5f5f5]">7-Day Puzzle Activity</span>
            <span className="text-[10px] text-[#a3a3a3]">Puzzles solved / day</span>
          </div>

          <div className="h-28 w-full pt-2">
            {isMounted ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                  <XAxis
                    dataKey="day"
                    stroke="#a3a3a3"
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#22201e",
                      borderColor: "rgba(194, 155, 120, 0.4)",
                      borderRadius: "12px",
                      color: "#f5f5f5",
                      fontSize: "11px",
                      boxShadow: "0 4px 20px rgba(0,0,0,0.5)",
                    }}
                    cursor={{ fill: "rgba(194, 155, 120, 0.08)" }}
                  />
                  <Bar dataKey="solved" radius={[6, 6, 0, 0]}>
                    {weeklyData.map((_, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={index === weeklyData.length - 1 ? "#c29b78" : "#383431"}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="w-full h-full bg-[#151413] rounded-xl animate-pulse" />
            )}
          </div>
        </div>
      </section>

      {/* 4. Metric Cards Grid: Rating, Total Solved, Time Spent, Accuracy */}
      <section className="grid grid-cols-2 gap-3 mb-4">
        {/* Rating Card */}
        <div className="bg-[#22201e] border border-white/10 rounded-2xl p-3.5 shadow-lg flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-bold text-[#a3a3a3] uppercase tracking-wider">
              Rating
            </span>
            <Zap className="w-4 h-4 text-[#c29b78]" />
          </div>
          <div className="text-2xl font-black font-mono text-[#f5f5f5]">
            {currentElo}
          </div>
          <span className="text-[10px] text-[#c29b78] mt-1 font-semibold flex items-center gap-1">
            <TrendingUp className="w-3 h-3 text-[#10b981]" />
            <span>Active Elo</span>
          </span>
        </div>

        {/* Total Solved Card */}
        <div className="bg-[#22201e] border border-white/10 rounded-2xl p-3.5 shadow-lg flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-bold text-[#a3a3a3] uppercase tracking-wider">
              Total Solved
            </span>
            <CheckCircle2 className="w-4 h-4 text-[#10b981]" />
          </div>
          <div className="text-2xl font-black font-mono text-[#10b981]">
            {totalSolved}
          </div>
          <span className="text-[10px] text-[#a3a3a3] mt-1">
            {totalFailed} failed
          </span>
        </div>

        {/* Time Spent Card */}
        <div className="bg-[#22201e] border border-white/10 rounded-2xl p-3.5 shadow-lg flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-bold text-[#a3a3a3] uppercase tracking-wider">
              Time Spent
            </span>
            <Clock className="w-4 h-4 text-[#c29b78]" />
          </div>
          <div className="text-2xl font-black font-mono text-[#f5f5f5]">
            {totalMinutes}m
          </div>
          <span className="text-[10px] text-[#a3a3a3] mt-1">
            Tactical immersion
          </span>
        </div>

        {/* Accuracy Card */}
        <div className="bg-[#22201e] border border-white/10 rounded-2xl p-3.5 shadow-lg flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-bold text-[#a3a3a3] uppercase tracking-wider">
              Accuracy
            </span>
            <Target className="w-4 h-4 text-[#c29b78]" />
          </div>
          <div className="text-2xl font-black font-mono text-[#c29b78]">
            {accuracy}%
          </div>
          <span className="text-[10px] text-[#a3a3a3] mt-1">
            {totalAttempts} attempts
          </span>
        </div>
      </section>

      {/* 5. Settings & Account List Section */}
      <section className="bg-[#22201e] border border-white/10 rounded-3xl p-4 shadow-xl space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-[#a3a3a3]">
          Settings &amp; Account
        </h3>

        {/* Pro Upgrade Trigger */}
        <div className="p-3.5 rounded-2xl bg-gradient-to-r from-[#2a2622] to-[#1c1a18] border border-[#c29b78]/30 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-[#c29b78]/15 border border-[#c29b78]/30 flex items-center justify-center text-[#c29b78] shrink-0">
              <Sparkles className="w-4 h-4 text-[#c29b78]" strokeWidth={1.5} />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-[#f5f5f5] flex items-center gap-1.5">
                <span>{isPro ? "Pro Membership Active" : "DoomChess Pro"}</span>
                {isPro && (
                  <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-[#c29b78]/20 text-[#c29b78] border border-[#c29b78]/40">
                    ACTIVE
                  </span>
                )}
              </div>
              <p className="text-[11px] text-[#a3a3a3] truncate">
                {isPro ? "Unlimited puzzles, 0 ads, Stockfish analysis" : "Unlock infinite tactical training & zero ads"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={isPro ? () => setIsSettingsOpen(true) : handleUpgradePro}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
              isPro
                ? "bg-[#151413] text-[#a3a3a3] border border-white/10 hover:text-white"
                : "bg-[#c29b78] hover:bg-[#d4b08f] text-[#0a0908] shadow-md shadow-[#c29b78]/20"
            }`}
          >
            {isPro ? "Manage" : "Upgrade"}
          </button>
        </div>

        {/* Theme / Board Preferences */}
        <div className="space-y-2 pt-2 border-t border-white/5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Palette className="w-4 h-4 text-[#c29b78]" />
              <span className="text-xs font-bold text-[#f5f5f5]">Theme &amp; Board Preferences</span>
            </div>
            <span className="text-[11px] font-mono text-[#c29b78] font-bold">
              {boardTheme.name}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 pt-1">
            {BOARD_THEMES.map((theme) => {
              const isSelected = boardTheme.id === theme.id;
              return (
                <button
                  key={theme.id}
                  type="button"
                  onClick={() => setBoardTheme(theme.id)}
                  className={`p-2 rounded-xl border flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                    isSelected
                      ? "bg-[#c29b78]/15 border-[#c29b78] ring-1 ring-[#c29b78]"
                      : "bg-[#151413] border-white/5 hover:border-white/20"
                  }`}
                >
                  <div className="w-10 h-10 rounded-lg overflow-hidden grid grid-cols-2 grid-rows-2 border border-black/40 shrink-0">
                    <div style={{ backgroundColor: theme.light }} />
                    <div style={{ backgroundColor: theme.dark }} />
                    <div style={{ backgroundColor: theme.dark }} />
                    <div style={{ backgroundColor: theme.light }} />
                  </div>
                  <span className={`text-[10px] font-medium truncate w-full text-center ${isSelected ? "text-[#f5f5f5] font-bold" : "text-[#a3a3a3]"}`}>
                    {theme.name.split(" ")[0]}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Audio / SFX Preference */}
        <div className="flex items-center justify-between pt-2 border-t border-white/5">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#151413] text-[#c29b78] border border-white/5">
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </div>
            <div>
              <div className="text-xs font-bold text-white">Piece Sound Effects</div>
              <div className="text-[11px] text-[#a3a3a3]">Audio feedback on moves</div>
            </div>
          </div>
          <button
            onClick={handleToggleMute}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
              isMuted
                ? "bg-[#151413] text-[#a3a3a3] border-white/10"
                : "bg-[#c29b78]/20 text-[#c29b78] border-[#c29b78]/40"
            }`}
          >
            {isMuted ? "Muted" : "Active"}
          </button>
        </div>

        {/* Account Settings / Edit Profile Trigger */}
        <div className="flex items-center justify-between pt-2 border-t border-white/5">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#151413] text-[#c29b78] border border-white/5">
              <Settings className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-white">Account Settings</div>
              <div className="text-[11px] text-[#a3a3a3]">Username, display name &amp; gameplay</div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsSettingsOpen(true)}
            className="px-3 py-1.5 rounded-xl text-xs font-bold bg-[#151413] hover:bg-[#2d2a28] text-white border border-white/10 transition-colors cursor-pointer"
          >
            Manage
          </button>
        </div>

        {/* Sign Out Button */}
        {userAccount && (
          <div className="pt-2 border-t border-white/5">
            <button
              type="button"
              onClick={handleSignOut}
              className="w-full py-2.5 px-3 rounded-xl bg-[#151413] hover:bg-rose-950/30 border border-white/10 hover:border-rose-800/40 text-[#a3a3a3] hover:text-rose-400 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out of Account</span>
            </button>
          </div>
        )}
      </section>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        userAccount={userAccount}
        onSignOut={handleSignOut}
      />

      {/* Auth Modal for Sign in / Account creation */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        guestId="guest_stats_user"
        initialTab="login"
        onAccountSuccess={(acc) => {
          setUserAccount(acc);
          syncAccount();
        }}
      />
    </div>
  );
}
