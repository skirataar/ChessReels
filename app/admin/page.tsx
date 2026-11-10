"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Shield,
  Key,
  Users,
  Database,
  Crown,
  Activity,
  Search,
  Trash2,
  Edit3,
  Check,
  X,
  LogOut,
  Sparkles,
  RefreshCw,
  Plus,
  TrendingUp,
  Flame,
  Zap,
  Terminal,
  Award,
  Heart,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowRight,
  Filter,
  Sliders,
  Film,
} from "lucide-react";
import { formatTitle } from "@/lib/formatTitle";

interface AdminMetrics {
  totalUsers: number;
  freeUsers: number;
  proUsers: number;
  calibratedUsers: number;
  totalPuzzles: number;
  topLikedPuzzles: number;
  estimatedMRR?: number;
  revenueCurrency?: string;
  proMonthlyPrice?: number;
  proConversionRate?: number;
  dbLatencyMs: number;
  status: string;
}

interface UserRecord {
  id: string;
  username: string | null;
  displayName: string | null;
  email: string | null;
  avatar: string | null;
  elo: number;
  peakElo: number;
  streak: number;
  bestStreak: number;
  isCalibrated: boolean;
  calibrationStep: number;
  plan: string | null;
  googleId: string | null;
  createdAt: string;
}

interface PuzzleRecord {
  id: string;
  fen: string;
  moves: string;
  rating: number;
  popularity: number;
  themes: string;
  openingTags: string | null;
  likes: number;
}

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [secretKeyInput, setSecretKeyInput] = useState<string>("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState<boolean>(false);

  // Active console tab
  const [activeTab, setActiveTab] = useState<"overview" | "users" | "monetization" | "puzzles" | "logs">("overview");

  // Tier rules & monetization state
  const [tierConfig, setTierConfig] = useState<{
    freePuzzleLimit: number;
    freeWindowHours: number;
    adFrequencyPuzzles: number;
    proMonthlyPrice: number;
    annualDiscountPercent: number;
  }>({
    freePuzzleLimit: 15,
    freeWindowHours: 4,
    adFrequencyPuzzles: 2,
    proMonthlyPrice: 200,
    annualDiscountPercent: 5,
  });
  const [isSavingConfig, setIsSavingConfig] = useState<boolean>(false);

  // Telemetry & metrics state
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
  const [recentUsers, setRecentUsers] = useState<any[]>([]);
  const [recentSolves, setRecentSolves] = useState<any[]>([]);
  const [isLoadingMetrics, setIsLoadingMetrics] = useState<boolean>(false);

  // Users management state
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [userSearch, setUserSearch] = useState<string>("");
  const [userFilter, setUserFilter] = useState<"registered" | "all" | "pro">("registered");
  const [userSortBy, setUserSortBy] = useState<"elo" | "streak" | "createdAt">("elo");
  const [isLoadingUsers, setIsLoadingUsers] = useState<boolean>(false);
  const [userPage, setUserPage] = useState<number>(1);
  const [userTotalPages, setUserTotalPages] = useState<number>(1);
  const [editingEloUserId, setEditingEloUserId] = useState<string | null>(null);
  const [newEloValue, setNewEloValue] = useState<string>("");

  // Puzzles management state
  const [puzzles, setPuzzles] = useState<PuzzleRecord[]>([]);
  const [puzzleSearch, setPuzzleSearch] = useState<string>("");
  const [puzzleMinRating, setPuzzleMinRating] = useState<string>("800");
  const [puzzleMaxRating, setPuzzleMaxRating] = useState<string>("2400");
  const [isLoadingPuzzles, setIsLoadingPuzzles] = useState<boolean>(false);
  const [puzzlePage, setPuzzlePage] = useState<number>(1);
  const [puzzleTotalPages, setPuzzleTotalPages] = useState<number>(1);
  const [selectedPuzzle, setSelectedPuzzle] = useState<PuzzleRecord | null>(null);

  // Community action feedback
  const [communityActionLoading, setCommunityActionLoading] = useState<string | null>(null);
  const [bannerMessage, setBannerMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // New puzzle modal state
  const [isAddPuzzleOpen, setIsAddPuzzleOpen] = useState<boolean>(false);
  const [newFen, setNewFen] = useState<string>("");
  const [newMoves, setNewMoves] = useState<string>("");
  const [newRating, setNewRating] = useState<string>("1500");
  const [newThemes, setNewThemes] = useState<string>("mateIn2 crushing");

  // Console session logs (avoid unstable Date during prerender)
  const [sessionLogs, setSessionLogs] = useState<string[]>([
    "Admin terminal initialized.",
  ]);

  const addLog = useCallback((msg: string) => {
    setSessionLogs((prev) => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev.slice(0, 49)]);
  }, []);

  const showBanner = (text: string, type: "success" | "error" = "success") => {
    setBannerMessage({ text, type });
    setTimeout(() => setBannerMessage(null), 4000);
  };

  const adminFetch = useCallback(async (url: string, options: RequestInit = {}) => {
    let token: string | null = null;
    try {
      if (typeof window !== "undefined") {
        token = sessionStorage.getItem("chess_reel_admin_token");
      }
    } catch {}
    const headers = {
      ...(options.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
    return fetch(url, { ...options, headers });
  }, []);

  // 1. Check existing session on mount
  useEffect(() => {
    setSessionLogs([`[${new Date().toLocaleTimeString()}] Admin terminal initialized.`]);
    adminFetch("/api/admin/auth")
      .then((r) => r.json())
      .then((data) => {
        setIsAuthenticated(Boolean(data.authenticated));
      })
      .catch(() => {
        setIsAuthenticated(false);
      });
  }, [adminFetch]);

  // 2. Fetch Metrics
  const fetchMetrics = useCallback(async () => {
    setIsLoadingMetrics(true);
    try {
      const res = await adminFetch("/api/admin/stats");
      if (res.ok) {
        const data = await res.json();
        setMetrics(data.metrics);
        setRecentUsers(data.recentUsers || []);
        setRecentSolves(data.recentSolves || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingMetrics(false);
    }
  }, []);

  // 3. Fetch Users
  const fetchUsers = useCallback(async () => {
    setIsLoadingUsers(true);
    try {
      const q = new URLSearchParams({
        search: userSearch,
        filter: userFilter,
        sortBy: userSortBy,
        order: "desc",
        page: userPage.toString(),
        limit: "25",
      });
      const res = await fetch(`/api/admin/users?${q.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
        setUserTotalPages(data.pagination?.totalPages || 1);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingUsers(false);
    }
  }, [userSearch, userFilter, userSortBy, userPage]);

  // 4. Fetch Puzzles
  const fetchPuzzles = useCallback(async () => {
    setIsLoadingPuzzles(true);
    try {
      const q = new URLSearchParams({
        search: puzzleSearch,
        minRating: puzzleMinRating,
        maxRating: puzzleMaxRating,
        page: puzzlePage.toString(),
        limit: "20",
      });
      const res = await fetch(`/api/admin/puzzles?${q.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setPuzzles(data.puzzles || []);
        setPuzzleTotalPages(data.pagination?.totalPages || 1);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingPuzzles(false);
    }
  }, [puzzleSearch, puzzleMinRating, puzzleMaxRating, puzzlePage]);

  // 5. Fetch Tier Configuration
  const fetchTierConfig = useCallback(async () => {
    try {
      const res = await adminFetch("/api/admin/config");
      if (res.ok) {
        const data = await res.json();
        if (data?.config) {
          setTierConfig(data.config);
        }
      }
    } catch (e) {
      console.error(e);
    }
  }, [adminFetch]);

  // Save Tier Configuration
  const handleSaveTierConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingConfig(true);
    try {
      const res = await adminFetch("/api/admin/config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(tierConfig),
      });
      console.log("SAVE TIER CONFIG STATUS:", res.status);
      if (res.ok) {
        const data = await res.json();
        console.log("SAVE TIER CONFIG OK:", data);
        showBanner(data.message || "Tier rules & ad settings saved!");
        addLog(
          `Updated Rules: Free ${tierConfig.freePuzzleLimit} puzzles / ${tierConfig.freeWindowHours}h. Ads every ${tierConfig.adFrequencyPuzzles} puzzles.`
        );
      } else {
        const errData = await res.json().catch(() => ({}));
        console.log("SAVE TIER CONFIG ERROR:", errData);
        showBanner(errData.error || "Failed to save tier settings", "error");
      }
    } catch (err) {
      console.log("SAVE TIER CONFIG CATCH:", err);
      showBanner("Network error while saving tier settings", "error");
    } finally {
      setIsSavingConfig(false);
    }
  };

  // Trigger data loads when authenticated and tab changes
  useEffect(() => {
    if (isAuthenticated) {
      fetchMetrics();
    }
  }, [isAuthenticated, fetchMetrics]);

  useEffect(() => {
    if (isAuthenticated && activeTab === "users") {
      fetchUsers();
    }
  }, [isAuthenticated, activeTab, fetchUsers]);

  useEffect(() => {
    if (isAuthenticated && activeTab === "monetization") {
      fetchTierConfig();
    }
  }, [isAuthenticated, activeTab, fetchTierConfig]);

  useEffect(() => {
    if (isAuthenticated && activeTab === "puzzles") {
      fetchPuzzles();
    }
  }, [isAuthenticated, activeTab, fetchPuzzles]);

  // Login handler
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!secretKeyInput.trim()) return;
    setIsLoggingIn(true);
    setAuthError(null);

    try {
      const res = await fetch("/api/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secretKey: secretKeyInput.trim() }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data?.token && typeof window !== "undefined") {
          try {
            sessionStorage.setItem("chess_reel_admin_token", data.token);
          } catch {}
        }
        setIsAuthenticated(true);
        setSecretKeyInput("");
        addLog("Authenticated successfully with Master Admin Key.");
        showBanner("Welcome to ChessReels Mission Control");
      } else {
        const data = await res.json();
        setAuthError(data.error || "Access denied: Invalid key.");
      }
    } catch {
      setAuthError("Failed to authenticate with admin server.");
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Logout handler
  const handleLogout = async () => {
    try {
      if (typeof window !== "undefined") {
        sessionStorage.removeItem("chess_reel_admin_token");
      }
    } catch {}
    await adminFetch("/api/admin/auth", { method: "DELETE" });
    setIsAuthenticated(false);
    addLog("Session locked by administrator.");
  };

  // Purge test debris
  const handlePurgeTestUsers = async () => {
    if (!confirm("Are you sure you want to purge automated test debris accounts? Real registered users will be preserved.")) {
      return;
    }
    setCommunityActionLoading("purge");
    try {
      const res = await fetch("/api/admin/community", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "purge_tests" }),
      });
      const data = await res.json();
      if (res.ok) {
        addLog(`Test Debris Purge: ${data.message}`);
        showBanner(data.message || "Test accounts purged!");
        fetchMetrics();
        if (activeTab === "users") fetchUsers();
      } else {
        showBanner(data.error || "Failed to purge test accounts", "error");
      }
    } catch {
      showBanner("Network error while purging test accounts", "error");
    } finally {
      setCommunityActionLoading(null);
    }
  };

  // Toggle user plan (free <-> premium)
  const handleTogglePlan = async (user: UserRecord) => {
    const nextPlan = user.plan === "premium" ? "free" : "premium";
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, plan: nextPlan }),
      });
      if (res.ok) {
        setUsers((prev) =>
          prev.map((u) => (u.id === user.id ? { ...u, plan: nextPlan } : u))
        );
        addLog(`Updated @${user.username || user.id} subscription to ${nextPlan.toUpperCase()}.`);
        showBanner(`@${user.username || "User"} plan set to ${nextPlan.toUpperCase()}`);
        fetchMetrics();
      } else {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Failed to update subscription tier");
      }
    } catch (e) {
      console.error(e);
      showBanner("Failed to update subscription tier", "error");
    }
  };

  // Update user Elo rating
  const handleSaveElo = async (user: UserRecord) => {
    const eloNum = parseInt(newEloValue, 10);
    if (isNaN(eloNum) || eloNum < 100 || eloNum > 3500) {
      alert("Please enter a valid Elo between 100 and 3500");
      return;
    }

    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, elo: eloNum }),
      });
      if (res.ok) {
        setUsers((prev) =>
          prev.map((u) =>
            u.id === user.id ? { ...u, elo: eloNum, peakElo: Math.max(u.peakElo, eloNum) } : u
          )
        );
        setEditingEloUserId(null);
        setNewEloValue("");
        addLog(`Updated @${user.username || user.id} rating to ${eloNum} Elo.`);
        showBanner(`Rating updated to ${eloNum} Elo`);
      }
    } catch (e) {
      console.error(e);
      showBanner("Failed to update rating", "error");
    }
  };

  // Delete user
  const handleDeleteUser = async (user: UserRecord) => {
    if (!confirm(`Are you sure you want to permanently delete user @${user.username || user.id}?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/users?userId=${user.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setUsers((prev) => prev.filter((u) => u.id !== user.id));
        addLog(`Deleted user account: @${user.username || user.id}`);
        showBanner(`User deleted`);
        fetchMetrics();
      }
    } catch (e) {
      console.error(e);
      showBanner("Failed to delete user", "error");
    }
  };

  // Create custom puzzle
  const handleCreatePuzzle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFen.trim() || !newMoves.trim()) {
      alert("FEN and solution moves are required.");
      return;
    }

    try {
      const res = await fetch("/api/admin/puzzles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fen: newFen.trim(),
          moves: newMoves.trim(),
          rating: parseInt(newRating, 10) || 1500,
          themes: newThemes.trim(),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setIsAddPuzzleOpen(false);
        setNewFen("");
        setNewMoves("");
        addLog(`Created custom puzzle #${data.puzzle.id} (${data.puzzle.rating} Elo)`);
        showBanner(`Puzzle #${data.puzzle.id} published!`);
        fetchPuzzles();
        fetchMetrics();
      }
    } catch (e) {
      console.error(e);
      showBanner("Failed to create puzzle", "error");
    }
  };

  // Helper for rank badge styling
  const getRankBadge = (elo: number) => {
    if (elo >= 2400) {
      return {
        label: "GM",
        bg: "bg-amber-500/15 border-amber-500/40 text-amber-300",
        ring: "ring-amber-400/40",
      };
    }
    if (elo >= 2000) {
      return {
        label: "Master",
        bg: "bg-purple-500/15 border-purple-500/40 text-purple-300",
        ring: "ring-purple-400/40",
      };
    }
    if (elo >= 1600) {
      return {
        label: "Expert",
        bg: "bg-cyan-500/15 border-cyan-500/40 text-cyan-300",
        ring: "ring-cyan-400/40",
      };
    }
    if (elo >= 1200) {
      return {
        label: "Club",
        bg: "bg-emerald-500/15 border-emerald-500/40 text-emerald-300",
        ring: "ring-emerald-400/40",
      };
    }
    return {
      label: "Novice",
      bg: "bg-zinc-700/20 border-zinc-600/30 text-zinc-300",
      ring: "ring-zinc-500/30",
    };
  };

  // Loading screen while checking initial session
  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-[#09090b] flex flex-col items-center justify-center text-white">
        <div className="w-10 h-10 border-2 border-[#c29b78] border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-xs font-semibold text-zinc-400 tracking-wider uppercase">
          Verifying security credentials...
        </p>
      </div>
    );
  }

  // 1. MASTER KEY LOGIN GATE
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#09090b] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-900/60 via-[#09090b] to-[#040405] flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-zinc-900/80 backdrop-blur-2xl border border-zinc-800 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute -top-24 -left-24 w-48 h-48 bg-[#c29b78]/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="text-center mb-8 relative">
            <div className="inline-flex p-3 rounded-2xl bg-[#c29b78]/10 border border-[#c29b78]/25 text-[#c29b78] mb-3 shadow-[0_0_20px_rgba(194,155,120,0.15)]">
              <Shield className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight">
              ChessReels Console
            </h1>
            <p className="text-xs text-zinc-400 mt-1 font-medium">
              Mission Control & Admin Infrastructure
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4 relative">
            <div>
              <label className="block text-[11px] font-bold text-zinc-300 uppercase tracking-wider mb-2">
                Master Security Key
              </label>
              <div className="relative">
                <Key className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  value={secretKeyInput}
                  onChange={(e) => setSecretKeyInput(e.target.value)}
                  placeholder="Enter ADMIN_SECRET..."
                  autoFocus
                  required
                  className="w-full pl-10 pr-4 py-3 bg-zinc-950/80 border border-zinc-800 rounded-xl text-white text-sm focus:outline-none focus:border-[#c29b78] focus:ring-1 focus:ring-[#c29b78] transition-all"
                />
              </div>
            </div>

            {authError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{authError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full py-3.5 bg-gradient-to-r from-[#c29b78] to-[#dfba94] hover:from-[#b58e6c] hover:to-[#c29b78] text-zinc-950 font-bold text-sm rounded-xl transition-all shadow-lg shadow-[#c29b78]/20 flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98] disabled:opacity-50"
            >
              {isLoggingIn ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Shield className="w-4 h-4" />
              )}
              <span>Unlock Admin Console</span>
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-zinc-800/80 text-center">
            <span className="text-[11px] text-zinc-500 font-mono">
              Protected by SHA-256 Signature Auth
            </span>
          </div>
        </div>
      </div>
    );
  }

  // 2. AUTHENTICATED EXECUTIVE MISSION CONTROL
  return (
    <div className="min-h-screen bg-[#09090b] text-white selection:bg-[#c29b78] selection:text-black">
      {/* Toast Banner */}
      {bannerMessage && (
        <div className="fixed top-4 right-4 z-50 animate-in fade-in slide-in-from-top-4 duration-200">
          <div
            className={`px-4 py-2.5 rounded-xl border shadow-2xl flex items-center gap-2.5 text-xs font-semibold backdrop-blur-xl ${
              bannerMessage.type === "success"
                ? "bg-emerald-950/90 border-emerald-500/40 text-emerald-300"
                : "bg-rose-950/90 border-rose-500/40 text-rose-300"
            }`}
          >
            {bannerMessage.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span>{bannerMessage.text}</span>
          </div>
        </div>
      )}

      {/* Top Executive Header */}
      <header className="sticky top-0 z-40 bg-[#09090b]/85 backdrop-blur-xl border-b border-zinc-800/80 px-4 lg:px-8 py-3.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#c29b78] to-[#8c6b4b] flex items-center justify-center text-zinc-950 shadow-md shadow-[#c29b78]/20 font-bold">
              ♚
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-sm tracking-tight text-white">
                  ChessReels
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300">
                  Mission Control
                </span>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-zinc-400 font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Live System</span>
                <span>•</span>
                <span>DB: {metrics?.dbLatencyMs ?? 0}ms</span>
              </div>
            </div>
          </div>

          {/* Quick Actions & Logout */}
          <div className="flex items-center gap-2">
            <button
              onClick={handlePurgeTestUsers}
              disabled={communityActionLoading === "purge"}
              title="Clean up test accounts and ghost users"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-800/80 hover:bg-zinc-800 border border-zinc-700/60 text-zinc-300 text-xs font-semibold transition-all cursor-pointer active:scale-95 disabled:opacity-50"
            >
              {communityActionLoading === "purge" ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Trash2 className="w-3.5 h-3.5" />
              )}
              <span>Purge Test Debris</span>
            </button>

            <button
              onClick={() => {
                fetchMetrics();
                if (activeTab === "users") fetchUsers();
                if (activeTab === "puzzles") fetchPuzzles();
                addLog("Manually refreshed platform telemetry.");
              }}
              title="Refresh Telemetry"
              className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white transition-all cursor-pointer active:scale-90"
            >
              <RefreshCw className={`w-4 h-4 ${isLoadingMetrics ? "animate-spin" : ""}`} />
            </button>

            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 text-xs font-bold transition-all cursor-pointer active:scale-95"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Lock Console</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 lg:px-8 py-6 space-y-6">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-zinc-800/80 pb-3 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab("overview")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === "overview"
                ? "bg-[#c29b78] text-zinc-950 shadow-md shadow-[#c29b78]/25"
                : "bg-zinc-900/60 text-zinc-400 hover:text-white hover:bg-zinc-800/60"
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Executive Overview</span>
          </button>

          <button
            onClick={() => setActiveTab("users")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === "users"
                ? "bg-[#c29b78] text-zinc-950 shadow-md shadow-[#c29b78]/25"
                : "bg-zinc-900/60 text-zinc-400 hover:text-white hover:bg-zinc-800/60"
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Registered Users ({metrics?.totalUsers ?? users.length})</span>
          </button>

          <button
            onClick={() => {
              setActiveTab("monetization");
              fetchTierConfig();
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === "monetization"
                ? "bg-[#c29b78] text-zinc-950 shadow-md shadow-[#c29b78]/25"
                : "bg-zinc-900/60 text-zinc-400 hover:text-white hover:bg-zinc-800/60"
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Tier Rules & Ads</span>
          </button>

          <button
            onClick={() => setActiveTab("puzzles")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === "puzzles"
                ? "bg-[#c29b78] text-zinc-950 shadow-md shadow-[#c29b78]/25"
                : "bg-zinc-900/60 text-zinc-400 hover:text-white hover:bg-zinc-800/60"
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>Puzzle Intelligence</span>
          </button>

          <button
            onClick={() => setActiveTab("logs")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === "logs"
                ? "bg-[#c29b78] text-zinc-950 shadow-md shadow-[#c29b78]/25"
                : "bg-zinc-900/60 text-zinc-400 hover:text-white hover:bg-zinc-800/60"
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>Audit Logs ({sessionLogs.length})</span>
          </button>
        </div>

        {/* ================= TAB 1: EXECUTIVE OVERVIEW ================= */}
        {activeTab === "overview" && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* 4 Hero KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Metric 1: Registered Users */}
              <div className="bg-zinc-900/70 backdrop-blur-xl border border-zinc-800 rounded-2xl p-5 shadow-lg relative overflow-hidden flex flex-col justify-between">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-zinc-400 tracking-wider uppercase">
                    Registered Users
                  </span>
                  <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400">
                    <Users className="w-4 h-4" />
                  </div>
                </div>
                <div>
                  <div className="text-3xl font-black text-white tracking-tight">
                    {metrics ? metrics.totalUsers : 0}
                  </div>
                  <div className="flex items-center justify-between text-xs text-zinc-400 mt-2">
                    <span>Pro: {metrics?.proUsers ?? 0}</span>
                    <span>Free: {metrics?.freeUsers ?? 0}</span>
                  </div>
                </div>
                <div className="w-full bg-zinc-800 h-1.5 rounded-full mt-3 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-cyan-400 to-[#c29b78] h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(100, Math.max(0, metrics?.proConversionRate ?? 0))}%`,
                    }}
                  />
                </div>
              </div>

              {/* Metric 2: Pro Members MRR */}
              <div className="bg-zinc-900/70 backdrop-blur-xl border border-amber-500/30 rounded-2xl p-5 shadow-lg shadow-amber-500/5 relative overflow-hidden flex flex-col justify-between">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-amber-300 tracking-wider uppercase">
                    Pro Members MRR
                  </span>
                  <div className="p-2 rounded-xl bg-amber-500/15 text-amber-300">
                    <Crown className="w-4 h-4" />
                  </div>
                </div>
                <div>
                  <div className="text-3xl font-black text-amber-300 tracking-tight">
                    {metrics?.revenueCurrency === "INR" ? "₹" : "$"}
                    {metrics?.estimatedMRR ? metrics.estimatedMRR.toFixed(2) : "0.00"}
                  </div>
                  <p className="text-xs text-zinc-400 mt-2 font-medium">
                    {metrics?.proUsers ?? 0} Pro Members, current tier pricing
                  </p>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 font-semibold mt-3">
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>{metrics?.proConversionRate ?? 0}% Conversion Ratio</span>
                </div>
              </div>

              {/* Metric 3: Indexed Puzzles */}
              <div className="bg-zinc-900/70 backdrop-blur-xl border border-zinc-800 rounded-2xl p-5 shadow-lg relative overflow-hidden flex flex-col justify-between">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-zinc-400 tracking-wider uppercase">
                    Indexed Puzzles
                  </span>
                  <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400">
                    <Database className="w-4 h-4" />
                  </div>
                </div>
                <div>
                  <div className="text-3xl font-black text-white tracking-tight">
                    {(metrics?.totalPuzzles || 6157341).toLocaleString()}
                  </div>
                  <p className="text-xs text-zinc-400 mt-2 font-medium">
                    Master Games • Lichess Open Base
                  </p>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-zinc-400 font-semibold mt-3">
                  <Heart className="w-3.5 h-3.5 text-rose-400" />
                  <span>{metrics?.topLikedPuzzles || 0} Liked by Community</span>
                </div>
              </div>

              {/* Metric 4: Calibrated & Solves */}
              <div className="bg-zinc-900/70 backdrop-blur-xl border border-zinc-800 rounded-2xl p-5 shadow-lg relative overflow-hidden flex flex-col justify-between">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-zinc-400 tracking-wider uppercase">
                    Placement Calibrated
                  </span>
                  <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
                    <Flame className="w-4 h-4" />
                  </div>
                </div>
                <div>
                  <div className="text-3xl font-black text-emerald-400 tracking-tight">
                    {metrics?.calibratedUsers || 0}
                  </div>
                  <p className="text-xs text-zinc-400 mt-2 font-medium">
                    Placement Calibrated Solvers
                  </p>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 font-semibold mt-3">
                  <Zap className="w-3.5 h-3.5" />
                  <span>Real Rating Solvers</span>
                </div>
              </div>
            </div>

            {/* Split Row: Registered Leaderboard & Live Solves Stream */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left (2 cols): Top Registered Solvers */}
              <div className="lg:col-span-2 bg-zinc-900/70 backdrop-blur-xl border border-zinc-800 rounded-2xl p-6 shadow-xl">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Award className="w-5 h-5 text-[#c29b78]" />
                    <h2 className="text-base font-bold text-white tracking-tight">
                      Registered Players Leaderboard
                    </h2>
                  </div>
                  <button
                    onClick={() => setActiveTab("users")}
                    className="text-xs font-bold text-[#c29b78] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <span>View all members</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="space-y-2.5">
                  {(recentUsers.length > 0 ? recentUsers : users.slice(0, 6)).length === 0 ? (
                    <div className="py-8 text-center text-zinc-500 text-xs">
                      No registered players yet.
                    </div>
                  ) : (
                    (recentUsers.length > 0 ? recentUsers : users.slice(0, 6)).map((user, idx) => {
                      const rank = getRankBadge(user.elo);
                      return (
                        <div
                          key={user.id || idx}
                          className="p-3 rounded-xl bg-zinc-950/60 border border-zinc-800/80 hover:border-zinc-700/80 flex items-center justify-between gap-3 transition-colors"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="text-xs font-bold text-zinc-500 w-4">
                              #{idx + 1}
                            </span>
                            <div className={`w-9 h-9 rounded-xl bg-gradient-to-br from-zinc-800 to-zinc-900 border ${rank.ring} flex items-center justify-center text-lg shrink-0 shadow-inner overflow-hidden`}>
                              {user.avatar?.startsWith("http") ? (
                                <img src={user.avatar} alt="Avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                              ) : (
                                user.avatar || "♟"
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-sm text-white truncate">
                                  {user.displayName || user.username || "Registered User"}
                                </span>
                                {user.plan === "premium" && (
                                  <span className="p-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] font-bold flex items-center gap-1">
                                    <Sparkles className="w-3.5 h-3.5 text-[#c29b78] inline-block shrink-0" strokeWidth={1.5} />
                                    <span>PRO</span>
                                  </span>
                                )}
                              </div>
                              <span className="text-xs text-zinc-500 font-mono">
                                @{user.username || user.id.slice(0, 8)}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 shrink-0">
                            <div
                              className="flex items-center gap-1 text-xs text-amber-400 font-bold"
                              title={`Active daily streak: ${user.streak || 0} consecutive days`}
                            >
                              <Flame className="w-3.5 h-3.5 fill-amber-400/20" />
                              <span>{user.streak || 0}d streak</span>
                            </div>

                            <div className={`px-2.5 py-1 rounded-lg border text-xs font-black font-mono ${rank.bg}`}>
                              {user.elo} <span className="text-[10px] opacity-80">{rank.label}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Right (1 col): Live Platform Solves Stream */}
              <div className="bg-zinc-900/70 backdrop-blur-xl border border-zinc-800 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <Activity className="w-5 h-5 text-emerald-400" />
                    <h2 className="text-base font-bold text-white tracking-tight">
                      Recent Verified Solves
                    </h2>
                  </div>

                  <div className="space-y-3">
                    {recentSolves.length === 0 ? (
                      <div className="py-12 text-center text-zinc-500 text-xs">
                        <Activity className="w-6 h-6 mx-auto mb-2 opacity-40 text-emerald-400" />
                        <span>No puzzle solves recorded yet.</span>
                        <p className="text-[11px] text-zinc-600 mt-1">Live solves from registered players stream here.</p>
                      </div>
                    ) : (
                      recentSolves.map((solve, sIdx) => (
                        <div
                          key={solve.id || sIdx}
                          className="p-2.5 rounded-xl bg-zinc-950/60 border border-zinc-800/80 flex items-center justify-between text-xs"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                            <span className="font-mono text-zinc-300">
                              #{solve.puzzleId}
                            </span>
                            <span className="text-zinc-500">•</span>
                            <span className="text-zinc-400 font-semibold truncate">
                              @{solve.user?.username || solve.user?.displayName || "player"}
                            </span>
                          </div>
                          <span className="text-emerald-400 font-bold font-mono text-[11px] shrink-0">
                            Solved
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-zinc-800 text-center">
                  <span className="text-[11px] text-zinc-500 font-medium">
                    Telemetry auto-refreshed in real-time
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 2: REGISTERED USERS ================= */}
        {activeTab === "users" && (
          <div className="space-y-4 animate-in fade-in duration-200">
            {/* Filter Bar */}
            <div className="bg-zinc-900/70 backdrop-blur-xl border border-zinc-800 rounded-2xl p-4 shadow-lg flex flex-col md:flex-row items-center justify-between gap-3">
              <div className="relative w-full md:w-80">
                <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={userSearch}
                  onChange={(e) => {
                    setUserSearch(e.target.value);
                    setUserPage(1);
                  }}
                  placeholder="Search by username or name..."
                  className="w-full pl-10 pr-4 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#c29b78]"
                />
              </div>

              <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto no-scrollbar">
                <button
                  onClick={() => {
                    setUserFilter("registered");
                    setUserPage(1);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
                    userFilter === "registered"
                      ? "bg-[#c29b78] text-zinc-950"
                      : "bg-zinc-950 text-zinc-400 hover:text-white border border-zinc-800"
                  }`}
                >
                  Registered Users
                </button>

                <button
                  onClick={() => {
                    setUserFilter("pro");
                    setUserPage(1);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1 ${
                    userFilter === "pro"
                      ? "bg-amber-400 text-zinc-950"
                      : "bg-zinc-950 text-zinc-400 hover:text-white border border-zinc-800"
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5 text-[#c29b78] inline-block shrink-0" strokeWidth={1.5} />
                  <span>Pro Members</span>
                </button>

                <button
                  onClick={() => {
                    setUserFilter("all");
                    setUserPage(1);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
                    userFilter === "all"
                      ? "bg-zinc-700 text-white"
                      : "bg-zinc-950 text-zinc-400 hover:text-white border border-zinc-800"
                  }`}
                >
                  All Accounts
                </button>

                <div className="h-5 w-px bg-zinc-800 mx-1 shrink-0" />

                <select
                  value={userSortBy}
                  onChange={(e) => setUserSortBy(e.target.value as any)}
                  className="bg-zinc-950 border border-zinc-800 text-zinc-300 text-xs rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-[#c29b78] cursor-pointer"
                >
                  <option value="elo">Sort: Highest Elo</option>
                  <option value="streak">Sort: Longest Daily Streak</option>
                  <option value="createdAt">Sort: Recently Joined</option>
                </select>
              </div>
            </div>

            {/* Users Data Table */}
            <div className="bg-zinc-900/70 backdrop-blur-xl border border-zinc-800 rounded-2xl shadow-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-zinc-950/80 border-b border-zinc-800 text-zinc-400 font-bold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="py-3 px-4">Member Profile</th>
                      <th className="py-3 px-4">Rating & Rank</th>
                      <th className="py-3 px-4">Streak & Activity</th>
                      <th className="py-3 px-4">Subscription Plan</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60">
                    {isLoadingUsers ? (
                      <tr>
                        <td colSpan={5} className="py-12 text-center text-zinc-500">
                          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[#c29b78]" />
                          <span>Loading registered user records...</span>
                        </td>
                      </tr>
                    ) : users.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-12 text-center text-zinc-500">
                          No registered users found.
                        </td>
                      </tr>
                    ) : (
                      users.map((user) => {
                        const rank = getRankBadge(user.elo);
                        return (
                          <tr key={user.id} className="hover:bg-zinc-800/30 transition-colors">
                            {/* Member Profile */}
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-3">
                                <div className={`w-9 h-9 rounded-xl bg-gradient-to-br from-zinc-800 to-zinc-900 border ${rank.ring} flex items-center justify-center text-lg shrink-0 shadow-inner overflow-hidden`}>
                                  {user.avatar?.startsWith("http") ? (
                                    <img src={user.avatar} alt="Avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                  ) : (
                                    user.avatar || "♟"
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <div className="font-bold text-white text-xs flex items-center gap-1.5">
                                    <span>{user.displayName || user.username || "Registered User"}</span>
                                    {user.plan === "premium" && (
                                      <Crown className="w-3 h-3 text-amber-400 shrink-0" />
                                    )}
                                  </div>
                                  <div className="flex items-center gap-1.5 text-[11px] text-zinc-500 font-mono truncate">
                                    <span>@{user.username || user.id.slice(0, 8)}</span>
                                    {user.email && (
                                      <>
                                        <span>•</span>
                                        <span className="text-zinc-400 truncate">{user.email}</span>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </td>

                            {/* Elo Rating */}
                            <td className="py-3 px-4">
                              {editingEloUserId === user.id ? (
                                <div className="flex items-center gap-1.5">
                                  <input
                                    type="number"
                                    value={newEloValue}
                                    onChange={(e) => setNewEloValue(e.target.value)}
                                    className="w-20 px-2 py-1 bg-zinc-950 border border-[#c29b78] rounded text-white text-xs"
                                    autoFocus
                                  />
                                  <button
                                    onClick={() => handleSaveElo(user)}
                                    className="p-1 rounded bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/40"
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => setEditingEloUserId(null)}
                                    className="p-1 rounded bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2">
                                  <span className={`px-2 py-0.5 rounded-lg border text-xs font-black font-mono ${rank.bg}`}>
                                    {user.elo}
                                  </span>
                                  <span className="text-[10px] text-zinc-500 font-semibold uppercase">
                                    {rank.label}
                                  </span>
                                  <button
                                    onClick={() => {
                                      setEditingEloUserId(user.id);
                                      setNewEloValue(user.elo.toString());
                                    }}
                                    className="text-zinc-500 hover:text-[#c29b78] cursor-pointer"
                                  >
                                    <Edit3 className="w-3 h-3" />
                                  </button>
                                </div>
                              )}
                            </td>

                            {/* Streak & Activity */}
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2">
                                <span
                                  className="inline-flex items-center gap-1 font-bold text-amber-400"
                                  title={`Current active daily streak: ${user.streak || 0} consecutive days`}
                                >
                                  <Flame className="w-3.5 h-3.5 fill-amber-400/20" />
                                  <span>{user.streak || 0}d streak</span>
                                </span>
                                <span className="text-zinc-600">•</span>
                                <span
                                  className="text-[11px] text-zinc-400 font-mono"
                                  title={`Best daily streak record: ${user.bestStreak || user.streak || 0} days`}
                                >
                                  Best: {user.bestStreak || user.streak || 0}d
                                </span>
                              </div>
                            </td>

                            {/* Subscription Plan Toggle */}
                            <td className="py-3 px-4">
                              <button
                                onClick={() => handleTogglePlan(user)}
                                className={`px-2.5 py-1 rounded-xl text-[11px] font-bold border transition-all cursor-pointer flex items-center gap-1.5 shadow-sm active:scale-95 ${
                                  user.plan === "premium"
                                    ? "bg-amber-500/15 border-amber-500/40 text-amber-300 hover:bg-amber-500/25"
                                    : "bg-zinc-800/80 border-zinc-700/80 text-zinc-400 hover:text-white"
                                }`}
                              >
                                {user.plan === "premium" ? (
                                  <>
                                    <Sparkles className="w-3.5 h-3.5 text-[#c29b78] inline-block shrink-0" strokeWidth={1.5} />
                                    <span>PRO MEMBER</span>
                                  </>
                                ) : (
                                  <span>FREE (ADS)</span>
                                )}
                              </button>
                            </td>

                            {/* Actions */}
                            <td className="py-3 px-4 text-right">
                              <button
                                onClick={() => handleDeleteUser(user)}
                                className="p-1.5 rounded-lg bg-zinc-800/60 hover:bg-rose-500/20 text-zinc-400 hover:text-rose-400 transition-colors cursor-pointer"
                                title="Delete User"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Table Pagination */}
              {userTotalPages > 1 && (
                <div className="px-4 py-3 bg-zinc-950/80 border-t border-zinc-800 flex items-center justify-between text-xs text-zinc-400">
                  <span>
                    Page {userPage} of {userTotalPages}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setUserPage((p) => Math.max(1, p - 1))}
                      disabled={userPage <= 1}
                      className="px-2.5 py-1 rounded bg-zinc-900 border border-zinc-800 hover:text-white disabled:opacity-40"
                    >
                      Prev
                    </button>
                    <button
                      onClick={() => setUserPage((p) => Math.min(userTotalPages, p + 1))}
                      disabled={userPage >= userTotalPages}
                      className="px-2.5 py-1 rounded bg-zinc-900 border border-zinc-800 hover:text-white disabled:opacity-40"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ================= TAB 3: TIER RULES & MONETIZATION ================= */}
        {activeTab === "monetization" && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Header description */}
            <div className="bg-zinc-900/70 backdrop-blur-xl border border-zinc-800 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <Sliders className="w-5 h-5 text-[#c29b78]" />
                  <h2 className="text-base font-bold text-white tracking-tight">
                    Platform Tier Rules & Monetization Control
                  </h2>
                </div>
                <p className="text-xs text-zinc-400 mt-1 max-w-xl">
                  Configure free user puzzle limits, rolling window duration, and interstitial ad frequency. Pro users receive unlimited puzzles with 0 ads.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300">
                  Live DB Rules
                </span>
              </div>
            </div>

            {/* Config Form Grid */}
            <form onSubmit={handleSaveTierConfig} className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Card 1: Free Tier Puzzle Limit */}
              <div className="bg-zinc-900/70 backdrop-blur-xl border border-zinc-800 rounded-2xl p-5 shadow-lg flex flex-col justify-between space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
                      Free Puzzles Allowed
                    </span>
                    <Zap className="w-4 h-4 text-amber-400" />
                  </div>
                  <p className="text-xs text-zinc-400 mb-4">
                    Maximum number of puzzles a free user can solve or attempt before hitting the quota limit.
                  </p>
                  <div className="relative">
                    <input
                      type="number"
                      name="freePuzzleLimit"
                      min={1}
                      max={100}
                      value={tierConfig.freePuzzleLimit}
                      onChange={(e) =>
                        setTierConfig((prev) => ({
                          ...prev,
                          freePuzzleLimit: Math.max(1, parseInt(e.target.value, 10) || 1),
                        }))
                      }
                      required
                      className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-white font-mono font-bold text-sm focus:outline-none focus:border-[#c29b78]"
                    />
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-zinc-500">
                      puzzles
                    </span>
                  </div>
                </div>
                <div className="text-[11px] text-zinc-500">
                  Currently: <strong className="text-zinc-300">{tierConfig.freePuzzleLimit} puzzles</strong> per window
                </div>
              </div>

              {/* Card 2: Free Window Duration (Hours) */}
              <div className="bg-zinc-900/70 backdrop-blur-xl border border-zinc-800 rounded-2xl p-5 shadow-lg flex flex-col justify-between space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
                      Free Window Duration
                    </span>
                    <Clock className="w-4 h-4 text-cyan-400" />
                  </div>
                  <p className="text-xs text-zinc-400 mb-4">
                    The rolling hourly window in which the free puzzle quota resets (e.g. 4 hours).
                  </p>
                  <div className="relative">
                    <input
                      type="number"
                      name="freeWindowHours"
                      min={1}
                      max={72}
                      value={tierConfig.freeWindowHours}
                      onChange={(e) =>
                        setTierConfig((prev) => ({
                          ...prev,
                          freeWindowHours: Math.max(1, parseInt(e.target.value, 10) || 1),
                        }))
                      }
                      required
                      className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-white font-mono font-bold text-sm focus:outline-none focus:border-[#c29b78]"
                    />
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-zinc-500">
                      hours
                    </span>
                  </div>
                </div>
                <div className="text-[11px] text-zinc-500">
                  Currently: Quota resets every <strong className="text-zinc-300">{tierConfig.freeWindowHours} hours</strong>
                </div>
              </div>

              {/* Card 3: Ad Frequency */}
              <div className="bg-zinc-900/70 backdrop-blur-xl border border-zinc-800 rounded-2xl p-5 shadow-lg flex flex-col justify-between space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
                      Ad Frequency (Every X Puzzles)
                    </span>
                    <Film className="w-4 h-4 text-purple-400" />
                  </div>
                  <p className="text-xs text-zinc-400 mb-4">
                    How often an interstitial sponsor ad break is shown to free tier members.
                  </p>
                  <div className="relative">
                    <input
                      type="number"
                      name="adFrequencyPuzzles"
                      min={1}
                      max={50}
                      value={tierConfig.adFrequencyPuzzles}
                      onChange={(e) =>
                        setTierConfig((prev) => ({
                          ...prev,
                          adFrequencyPuzzles: Math.max(1, parseInt(e.target.value, 10) || 1),
                        }))
                      }
                      required
                      className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-white font-mono font-bold text-sm focus:outline-none focus:border-[#c29b78]"
                    />
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-zinc-500">
                      puzzles
                    </span>
                  </div>
                </div>
                <div className="text-[11px] text-zinc-500">
                  Currently: Shows ad break every <strong className="text-zinc-300">{tierConfig.adFrequencyPuzzles} puzzles</strong>
                </div>
              </div>

              {/* Card 4: Pro Subscription Pricing (Monthly & Annual Discount) */}
              <div className="bg-zinc-900/70 backdrop-blur-xl border border-amber-500/30 rounded-2xl p-5 shadow-lg flex flex-col justify-between space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-amber-300 uppercase tracking-wider">
                      Pro Pricing & Annual Discount
                    </span>
                    <Sparkles className="w-3.5 h-3.5 text-[#c29b78] inline-block shrink-0" strokeWidth={1.5} />
                  </div>
                  <p className="text-xs text-zinc-400 mb-4">
                    Monthly billing price and annual plan discount percentage for Pro tier subscribers.
                  </p>
                  
                  <div className="space-y-3">
                    {/* Monthly Price */}
                    <div>
                      <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
                        Monthly Plan Price
                      </label>
                      <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-zinc-400">
                          ₹
                        </span>
                        <input
                          type="number"
                          name="proMonthlyPrice"
                          min={1}
                          max={50000}
                          value={tierConfig.proMonthlyPrice}
                          onChange={(e) =>
                            setTierConfig((prev) => ({
                              ...prev,
                              proMonthlyPrice: Math.max(1, parseInt(e.target.value, 10) || 1),
                            }))
                          }
                          required
                          className="w-full pl-8 pr-12 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-white font-mono font-bold text-sm focus:outline-none focus:border-[#c29b78]"
                        />
                        <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-zinc-500">
                          / mo
                        </span>
                      </div>
                    </div>

                    {/* Annual Plan Discount */}
                    <div>
                      <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
                        Annual Plan Discount
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          name="annualDiscountPercent"
                          min={0}
                          max={90}
                          value={tierConfig.annualDiscountPercent}
                          onChange={(e) =>
                            setTierConfig((prev) => ({
                              ...prev,
                              annualDiscountPercent: Math.max(0, Math.min(90, parseInt(e.target.value, 10) || 0)),
                            }))
                          }
                          required
                          className="w-full px-4 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-white font-mono font-bold text-sm focus:outline-none focus:border-[#c29b78]"
                        />
                        <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-emerald-400">
                          % save
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="text-[11px] text-zinc-400 space-y-0.5 pt-2 border-t border-zinc-800/60">
                  <div>Monthly: <strong className="text-zinc-200">₹{tierConfig.proMonthlyPrice}/mo</strong></div>
                  <div>Annual: <strong className="text-emerald-400">₹{Math.round(tierConfig.proMonthlyPrice * 12 * (1 - tierConfig.annualDiscountPercent / 100))}/yr</strong> (₹{Math.round(tierConfig.proMonthlyPrice * (1 - tierConfig.annualDiscountPercent / 100))}/mo • Save {tierConfig.annualDiscountPercent}%)</div>
                </div>
              </div>

              {/* Live Rule Summary Card */}
              <div className="md:col-span-2 p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-[#c29b78]/10 to-transparent border border-amber-500/30 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-300">
                    <Shield className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white">
                      Effective Tier Enforcement
                    </div>
                    <div className="text-[11px] text-zinc-400 mt-0.5">
                      Free Users: <span className="text-amber-300 font-semibold">{tierConfig.freePuzzleLimit} puzzles / {tierConfig.freeWindowHours}h</span> (Ads every {tierConfig.adFrequencyPuzzles} puzzles) • Pro Users: <span className="text-emerald-400 font-semibold">Unlimited & 0 Ads (₹{tierConfig.proMonthlyPrice}/mo, Save {tierConfig.annualDiscountPercent}% Annual)</span>
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSavingConfig}
                  className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-amber-400 to-[#c29b78] hover:from-amber-300 hover:to-[#dfba94] text-zinc-950 font-black text-xs rounded-xl transition-all shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 cursor-pointer active:scale-98 disabled:opacity-50"
                >
                  {isSavingConfig ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Check className="w-3.5 h-3.5" />
                  )}
                  <span>Save Configuration</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ================= TAB 4: PUZZLE INTELLIGENCE ================= */}
        {activeTab === "puzzles" && (
          <div className="space-y-4 animate-in fade-in duration-200">
            {/* Filter & Add Row */}
            <div className="bg-zinc-900/70 backdrop-blur-xl border border-zinc-800 rounded-2xl p-4 shadow-lg flex flex-col md:flex-row items-center justify-between gap-3">
              <div className="relative w-full md:w-80">
                <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={puzzleSearch}
                  onChange={(e) => {
                    setPuzzleSearch(e.target.value);
                    setPuzzlePage(1);
                  }}
                  placeholder="Search puzzle by ID, theme, opening..."
                  className="w-full pl-10 pr-4 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#c29b78]"
                />
              </div>

              <div className="flex items-center gap-2 w-full md:w-auto">
                <button
                  onClick={() => setIsAddPuzzleOpen(true)}
                  className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#c29b78] to-[#dfba94] hover:from-[#b58e6c] hover:to-[#c29b78] text-zinc-950 font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-md active:scale-95"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Insert Custom Puzzle</span>
                </button>
              </div>
            </div>

            {/* Puzzles Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {isLoadingPuzzles ? (
                <div className="col-span-full py-16 text-center text-zinc-500">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[#c29b78]" />
                  <span>Searching puzzle database...</span>
                </div>
              ) : puzzles.length === 0 ? (
                <div className="col-span-full py-16 text-center text-zinc-500">
                  No puzzles found matching search criteria.
                </div>
              ) : (
                puzzles.map((p) => (
                  <div
                    key={p.id}
                    className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 hover:border-zinc-700 transition-colors flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-mono text-xs font-bold text-[#c29b78]">
                          #{p.id}
                        </span>
                        <span className="text-xs font-black font-mono px-2 py-0.5 rounded bg-zinc-800 text-white">
                          {p.rating} Elo
                        </span>
                      </div>
                      <p className="text-[11px] font-mono text-zinc-400 line-clamp-2 mb-2">
                        {p.fen}
                      </p>
                      <div className="flex flex-wrap gap-1 mb-3">
                        {p.themes.split(/\s+/).filter(Boolean).slice(0, 3).map((t, idx) => (
                          <span
                            key={idx}
                            className="px-1.5 py-0.5 rounded bg-zinc-800/80 text-[10px] text-zinc-400"
                          >
                            {formatTitle(t)}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-zinc-800/60 text-xs">
                      <span className="text-zinc-500 text-[10px]">
                        ❤️ {p.likes || 0} likes
                      </span>
                      <button
                        onClick={() => setSelectedPuzzle(p)}
                        className="text-xs font-bold text-[#c29b78] hover:underline cursor-pointer"
                      >
                        Inspect
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ================= TAB 4: AUDIT LOGS ================= */}
        {activeTab === "logs" && (
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4 shadow-xl font-mono text-xs text-zinc-300 space-y-2">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800 text-zinc-400">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-[#c29b78]" />
                <span className="font-bold">Console Audit Stream</span>
              </div>
              <button
                onClick={() => setSessionLogs([`[${new Date().toLocaleTimeString()}] Logs cleared.`])}
                className="text-[10px] text-zinc-500 hover:text-white"
              >
                Clear
              </button>
            </div>

            <div className="space-y-1 max-h-96 overflow-y-auto pt-2">
              {sessionLogs.map((log, index) => (
                <div key={index} className="leading-relaxed hover:bg-zinc-900/40 px-2 py-0.5 rounded">
                  <span className="text-[#c29b78]">{log.split("]")[0]}]</span>
                  <span>{log.split("]")[1]}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Modal: Insert Custom Puzzle */}
      {isAddPuzzleOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 w-full max-w-lg shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-white text-base">
                Insert Custom Chess Puzzle
              </h3>
              <button
                onClick={() => setIsAddPuzzleOpen(false)}
                className="text-zinc-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreatePuzzle} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1">
                  Board FEN
                </label>
                <input
                  type="text"
                  value={newFen}
                  onChange={(e) => setNewFen(e.target.value)}
                  placeholder="r1bqkb1r/pppp1ppp/2n5/4p3/..."
                  required
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1">
                  Solution Moves (UCI sequence)
                </label>
                <input
                  type="text"
                  value={newMoves}
                  onChange={(e) => setNewMoves(e.target.value)}
                  placeholder="e2e4 e7e5 g1f3"
                  required
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white text-xs font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1">
                    Rating (Elo)
                  </label>
                  <input
                    type="number"
                    value={newRating}
                    onChange={(e) => setNewRating(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1">
                    Tactical Themes
                  </label>
                  <input
                    type="text"
                    value={newThemes}
                    onChange={(e) => setNewThemes(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white text-xs"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddPuzzleOpen(false)}
                  className="px-4 py-2 rounded-lg bg-zinc-800 text-zinc-300 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-[#c29b78] text-zinc-950 text-xs font-bold shadow-md hover:bg-[#b58e6c]"
                >
                  Publish Puzzle
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Puzzle Inspector */}
      {selectedPuzzle && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <span className="font-mono text-sm font-bold text-[#c29b78]">
                Puzzle #{selectedPuzzle.id}
              </span>
              <button
                onClick={() => setSelectedPuzzle(null)}
                className="text-zinc-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-zinc-500 block mb-1">FEN Position</span>
                <p className="font-mono bg-zinc-950 p-2.5 rounded-lg border border-zinc-800 text-zinc-300 break-all">
                  {selectedPuzzle.fen}
                </p>
              </div>

              <div>
                <span className="text-zinc-500 block mb-1">Solution Moves</span>
                <p className="font-mono bg-zinc-950 p-2.5 rounded-lg border border-zinc-800 text-emerald-400 break-all font-bold">
                  {selectedPuzzle.moves}
                </p>
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="text-zinc-400 font-bold">
                  Rating: {selectedPuzzle.rating} Elo
                </span>
                <span className="text-rose-400 font-bold">
                  ❤️ {selectedPuzzle.likes || 0} Likes
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
