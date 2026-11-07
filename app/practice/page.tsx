"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  PuzzleCard,
  PuzzleData,
  PuzzleStatus,
} from "@/components/PuzzleCard";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import {
  SlidersHorizontal,
  RefreshCw,
  RotateCcw,
  Check,
  Sparkles,
  Filter,
  Lock,
  Crown,
  ArrowLeft,
  Zap,
  Target,
  ShieldCheck,
} from "lucide-react";
import { useTierQuota } from "@/lib/useTierQuota";
import { QuotaPaywallModal } from "@/components/QuotaPaywallModal";
import { GeoPricing, getPricingForCountry } from "@/lib/pricing";
import { clearGuestLocalSession, isGuestAccount } from "@/lib/guestAccount";
import { hydrateUserSession } from "@/lib/sessionHydration";

interface PracticeTheme {
  id: string;
  label: string;
}

const AVAILABLE_THEMES: PracticeTheme[] = [
  { id: "mateIn1", label: "Mate in 1" },
  { id: "mateIn2", label: "Mate in 2" },
  { id: "fork", label: "Fork" },
  { id: "pin", label: "Pin" },
  { id: "endgame", label: "Endgame" },
  { id: "skewer", label: "Skewer" },
  { id: "hangingPiece", label: "Hanging Piece" },
  { id: "discoveredAttack", label: "Discovered Attack" },
  { id: "backRankMate", label: "Back Rank" },
  { id: "crushing", label: "Crushing" },
];

const DEFAULT_MIN_RATING = 800;
const DEFAULT_MAX_RATING = 2400;

const FALLBACK_PRACTICE_PUZZLE: PuzzleData = {
  id: "practice_default",
  fen: "r1bqkb1r/pppp1ppp/2n5/4p3/2B1n3/5N2/PPPP1PPP/RNBQ1RK1 w kq - 0 5",
  moves: "d2d4 e5d4 f1e1",
  rating: 1200,
  ratingDeviation: 75,
  popularity: 95,
  nbPlays: 120,
  themes: "opening pin fork",
  gameUrl: "https://lichess.org",
  openingTags: "Italian Game",
};

export default function PracticePage() {
  const router = useRouter();

  // User account & Tier state
  const [account, setAccount] = useState<{
    id?: string;
    plan?: string;
    isPro?: boolean;
    subscriptionStatus?: string;
    currentPeriodEnd?: string | null;
  } | null>(() => {
    if (typeof window !== "undefined") {
      try {
        const raw = window.localStorage.getItem("chess_reel_account");
        if (raw) {
          const parsed = JSON.parse(raw);
          if (!isGuestAccount(parsed)) return parsed;
        }
      } catch {}
    }
    return null;
  });
  const [isClientReady, setIsClientReady] = useState(false);

  useEffect(() => {
    setIsClientReady(true);
    try {
      const raw = window.localStorage.getItem("chess_reel_account");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (isGuestAccount(parsed)) {
          clearGuestLocalSession();
          router.replace("/");
          return;
        }
        setAccount(parsed);
        if (parsed?.id) {
          fetch(`/api/user/account?userId=${encodeURIComponent(parsed.id)}`)
            .then((res) => (res.ok ? res.json() : null))
            .then((data) => {
              if (data?.user) {
                setAccount(data.user);
                hydrateUserSession(data.user);
              }
            })
            .catch(() => {});
        }
      } else {
        router.replace("/");
        return;
      }
    } catch {}
  }, [router]);

  const {
    isPro,
    refreshSubscription,
  } = useTierQuota(account?.id || "practice_user", account?.plan);

  const [geoPricing, setGeoPricing] = useState<GeoPricing>(() =>
    getPricingForCountry("US")
  );

  useEffect(() => {
    const timezone =
      typeof Intl !== "undefined"
        ? Intl.DateTimeFormat().resolvedOptions().timeZone
        : "";
    let cancelled = false;
    fetch(`/api/pricing/geo?tz=${encodeURIComponent(timezone)}`, {
      cache: "no-store",
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: GeoPricing | null) => {
        if (!cancelled && data?.monthly) setGeoPricing(data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  // Paywall Modal State
  const [isPaywallOpen, setIsPaywallOpen] = useState(false);

  // Auto-open paywall popup on mount if user is not pro
  useEffect(() => {
    if (isClientReady && !isPro) {
      setIsPaywallOpen(true);
    }
  }, [isClientReady, isPro]);

  // Listen for global open-quota-paywall events
  useEffect(() => {
    const handleOpen = (e: Event) => {
      setIsPaywallOpen(true);
    };
    window.addEventListener("open-quota-paywall", handleOpen);
    return () => window.removeEventListener("open-quota-paywall", handleOpen);
  }, []);

  // Filter States
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);
  const [minRating, setMinRating] = useState<number>(DEFAULT_MIN_RATING);
  const [maxRating, setMaxRating] = useState<number>(DEFAULT_MAX_RATING);
  const [selectedThemes, setSelectedThemes] = useState<string[]>([]);

  // Draft filters inside the Sheet
  const [draftRatingRange, setDraftRatingRange] = useState<number[]>([
    DEFAULT_MIN_RATING,
    DEFAULT_MAX_RATING,
  ]);
  const [draftThemes, setDraftThemes] = useState<string[]>([]);

  // Puzzle State
  const [currentPuzzle, setCurrentPuzzle] = useState<PuzzleData | null>(
    FALLBACK_PRACTICE_PUZZLE
  );
  const [puzzleStatus, setPuzzleStatus] = useState<PuzzleStatus>("playing");
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Sync draft filters when opening sheet
  const handleOpenSheet = () => {
    setDraftRatingRange([minRating, maxRating]);
    setDraftThemes([...selectedThemes]);
    setIsFilterSheetOpen(true);
  };

  // Toggle theme selection in draft
  const toggleTheme = (themeId: string) => {
    setDraftThemes((prev) =>
      prev.includes(themeId)
        ? prev.filter((t) => t !== themeId)
        : [...prev, themeId]
    );
  };

  // Fetch puzzle based on filters (only if user is Pro)
  const fetchPracticePuzzle = useCallback(
    async (
      overrideMin?: number,
      overrideMax?: number,
      overrideThemes?: string[]
    ) => {
      if (!isPro) return;

      setIsLoading(true);
      setPuzzleStatus("loading");

      const queryMin = overrideMin !== undefined ? overrideMin : minRating;
      const queryMax = overrideMax !== undefined ? overrideMax : maxRating;
      const queryThemes =
        overrideThemes !== undefined ? overrideThemes : selectedThemes;

      try {
        const params = new URLSearchParams();
        params.set("minRating", String(queryMin));
        params.set("maxRating", String(queryMax));
        if (queryThemes.length > 0) {
          params.set("themes", queryThemes.join(","));
        }

        const res = await fetch(`/api/puzzle/random?${params.toString()}`);
        if (res.ok) {
          const data = (await res.json()) as PuzzleData;
          setCurrentPuzzle(data);
          setPuzzleStatus("playing");
        } else {
          // Fallback if no specific puzzle matches strict theme
          const fallbackRes = await fetch(
            `/api/puzzle/random?minRating=${queryMin}&maxRating=${queryMax}`
          );
          if (fallbackRes.ok) {
            const data = (await fallbackRes.json()) as PuzzleData;
            setCurrentPuzzle(data);
            setPuzzleStatus("playing");
          }
        }
      } catch (err) {
        console.error("Failed to fetch practice puzzle:", err);
      } finally {
        setIsLoading(false);
      }
    },
    [isPro, minRating, maxRating, selectedThemes]
  );

  // Initial fetch on mount (only if isPro)
  const initialFetchDone = useRef(false);
  useEffect(() => {
    if (isPro && !initialFetchDone.current) {
      initialFetchDone.current = true;
      fetchPracticePuzzle();
    }
  }, [isPro, fetchPracticePuzzle]);

  // Apply filters from Sheet
  const handleApplyFilters = () => {
    const newMin = draftRatingRange[0] ?? DEFAULT_MIN_RATING;
    const newMax = draftRatingRange[1] ?? DEFAULT_MAX_RATING;
    setMinRating(newMin);
    setMaxRating(newMax);
    setSelectedThemes(draftThemes);
    setIsFilterSheetOpen(false);
    fetchPracticePuzzle(newMin, newMax, draftThemes);
  };

  // Reset filters in Sheet
  const handleResetFilters = () => {
    setDraftRatingRange([DEFAULT_MIN_RATING, DEFAULT_MAX_RATING]);
    setDraftThemes([]);
  };

  return (
    <div className="bg-[#151413] text-[#f5f5f5] min-h-screen flex flex-col w-full selection:bg-[#c29b78] selection:text-[#151413]">
      {/* 1. Header with Title & Filter / Lock status */}
      <header className="sticky top-0 z-30 bg-[#151413]/90 backdrop-blur-xl border-b border-white/10 px-4 py-3">
        <div className="max-w-md mx-auto flex items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-base font-black tracking-tight text-[#f5f5f5]">
                Practice Mode
              </span>
              {isPro ? (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-[#c29b78]/20 text-[#c29b78] border border-[#c29b78]/30">
                  Unranked Pro
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                  <Lock className="w-2.5 h-2.5" /> PRO ONLY
                </span>
              )}
            </div>
            <p className="text-[11px] text-[#a3a3a3]">
              {isPro
                ? "Targeted tactics training • No rating penalty"
                : "Reserved exclusively for Chess Reel Pro members"}
            </p>
          </div>

          {/* Header Action: Filter if Pro, Upgrade CTA if Free */}
          {isPro ? (
            <button
              onClick={handleOpenSheet}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#22201e] hover:bg-[#2d2a28] border border-[#c29b78]/40 text-[#c29b78] text-xs font-bold shadow-lg shadow-black/40 active:scale-95 transition-all cursor-pointer"
            >
              <SlidersHorizontal className="w-4 h-4 text-[#c29b78]" />
              <span>Filter Puzzles</span>
              {(selectedThemes.length > 0 ||
                minRating !== DEFAULT_MIN_RATING ||
                maxRating !== DEFAULT_MAX_RATING) && (
                <span className="w-2 h-2 rounded-full bg-[#c29b78] animate-pulse" />
              )}
            </button>
          ) : (
            <button
              onClick={() => setIsPaywallOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-400 to-[#c29b78] text-zinc-950 text-xs font-black shadow-md shadow-amber-500/20 active:scale-95 transition-all cursor-pointer"
            >
              <Crown className="w-3.5 h-3.5 fill-zinc-950" />
              <span>Unlock</span>
            </button>
          )}
        </div>

        {/* Active Filters Pill Bar (Pro only) */}
        {isPro &&
          (selectedThemes.length > 0 ||
            minRating !== DEFAULT_MIN_RATING ||
            maxRating !== DEFAULT_MAX_RATING) && (
            <div className="max-w-md mx-auto flex items-center gap-1.5 overflow-x-auto pt-2 scrollbar-none">
              <span className="text-[10px] font-bold text-[#a3a3a3] uppercase tracking-wider shrink-0">
                Active:
              </span>
              <span className="text-[11px] font-mono bg-[#22201e] text-[#c29b78] px-2 py-0.5 rounded-full border border-white/5 shrink-0">
                {minRating} - {maxRating} Elo
              </span>
              {selectedThemes.map((themeId) => {
                const label =
                  AVAILABLE_THEMES.find((t) => t.id === themeId)?.label ||
                  themeId;
                return (
                  <span
                    key={themeId}
                    className="text-[11px] bg-[#c29b78]/15 text-[#c29b78] px-2 py-0.5 rounded-full border border-[#c29b78]/30 font-semibold shrink-0"
                  >
                    {label}
                  </span>
                );
              })}
            </div>
          )}
      </header>

      {/* 2. Main Content: Locked Screen for Free Users, Tactical Board for Pro Users */}
      {!isPro ? (
        <main className="flex-1 flex flex-col items-center justify-center px-4 py-8 max-w-md mx-auto w-full text-center">
          <div className="w-full rounded-3xl bg-[#22201e]/90 border border-amber-500/40 p-6 sm:p-8 flex flex-col items-center shadow-2xl backdrop-blur-xl relative overflow-hidden">
            {/* Golden ambient background glow */}
            <div className="absolute -top-24 -left-24 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-[#c29b78]/10 rounded-full blur-3xl pointer-events-none" />

            {/* Lock / Crown Hero Icon */}
            <div className="relative mb-4">
              <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-amber-400 to-[#c29b78] flex items-center justify-center text-zinc-950 shadow-xl shadow-amber-500/25">
                <Lock className="w-8 h-8 stroke-[2.5]" />
              </div>
              <span className="absolute -bottom-1 -right-1 px-1.5 py-0.5 rounded-full bg-amber-500 text-[10px] font-black text-zinc-950 border border-[#22201e]">
                PRO
              </span>
            </div>

            <h2 className="text-xl font-black tracking-tight text-white mb-2">
              Practice Mode is Pro Only
            </h2>
            <p className="text-xs text-zinc-400 leading-relaxed mb-6 max-w-xs">
              Unlock targeted motif drills, custom Elo brackets, and unlimited unranked practice without risking your rating.
            </p>

            {/* Feature Highlights Grid */}
            <div className="w-full grid grid-cols-1 gap-2.5 mb-6 text-left">
              <div className="flex items-center gap-3 p-3 rounded-2xl bg-[#151413] border border-white/5">
                <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center shrink-0">
                  <Target className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white">Targeted Tactical Themes</div>
                  <div className="text-[11px] text-zinc-400">Mate in 1, Mate in 2, Pins, Forks, Skewers & Endgames</div>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-2xl bg-[#151413] border border-white/5">
                <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center shrink-0">
                  <SlidersHorizontal className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white">Custom Elo Brackets</div>
                  <div className="text-[11px] text-zinc-400">Tailor puzzle rating range freely from 600 to 2600 Elo</div>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-2xl bg-[#151413] border border-white/5">
                <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center shrink-0">
                  <Zap className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white">Unlimited Unranked Drills</div>
                  <div className="text-[11px] text-zinc-400">Zero quota limits, no timer stress, and zero rating loss</div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="w-full flex flex-col gap-2.5">
              <button
                data-testid="unlock-pro-cta-btn"
                onClick={() => setIsPaywallOpen(true)}
                className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-amber-400 to-[#c29b78] hover:from-amber-300 hover:to-[#d4b08f] text-zinc-950 font-black text-sm flex items-center justify-center gap-2 shadow-xl shadow-amber-500/25 active:scale-95 transition-all cursor-pointer"
              >
                <Crown className="w-4 h-4 fill-zinc-950" />
                <span>Unlock Practice Mode — {geoPricing.monthly.display}/mo</span>
              </button>

              <button
                onClick={() => router.push("/play")}
                className="w-full py-2.5 px-4 rounded-xl bg-[#151413] hover:bg-white/5 border border-white/10 text-zinc-400 hover:text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Ranked Play</span>
              </button>
            </div>
          </div>
        </main>
      ) : (
        <main className="flex-1 flex flex-col items-center justify-start pb-24 max-w-md mx-auto w-full">
          {isLoading || !currentPuzzle ? (
            <div className="w-full flex flex-col items-center justify-center gap-4 py-20">
              <div className="w-12 h-12 rounded-full border-3 border-[#c29b78] border-t-transparent animate-spin" />
              <p className="text-xs text-[#a3a3a3] font-mono uppercase tracking-wider">
                Finding filtered tactics...
              </p>
            </div>
          ) : (
            <PuzzleCard
              key={currentPuzzle.id}
              puzzle={currentPuzzle}
              status={puzzleStatus}
              currentElo={1200}
              streak={0}
              lastEloChange={null}
              mode="practice"
              isPro={true}
              onModeChange={(m) => {
                if (m === "ranked") {
                  router.push("/play");
                }
              }}
              onStatusChange={setPuzzleStatus}
              onEloUpdate={() => {
                // Practice mode: do not update ranked Elo
              }}
              onNextPuzzle={() => fetchPracticePuzzle()}
            />
          )}
        </main>
      )}

      {/* 3. shadcn Sheet: Bottom Drawer for Practice Filters (Pro only) */}
      {isPro && (
        <Sheet open={isFilterSheetOpen} onOpenChange={setIsFilterSheetOpen}>
          <SheetContent
            side="bottom"
            className="bg-[#22201e] text-[#f5f5f5] border-t border-white/10 rounded-t-3xl max-w-lg mx-auto p-5 pb-safe z-50 shadow-2xl"
          >
            <SheetHeader className="text-left mb-4">
              <SheetTitle className="text-lg font-black text-[#f5f5f5] flex items-center gap-2">
                <Filter className="w-5 h-5 text-[#c29b78]" />
                <span>Filter Practice Puzzles</span>
              </SheetTitle>
              <SheetDescription className="text-xs text-[#a3a3a3]">
                Customize rating bracket and tactical motifs for targeted drills.
              </SheetDescription>
            </SheetHeader>

            <div className="flex flex-col gap-5 py-2">
              {/* Rating Range Dual-Thumb Slider */}
              <div className="flex flex-col gap-2.5 bg-[#151413] p-3.5 rounded-2xl border border-white/5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#f5f5f5]">
                    Rating Range
                  </span>
                  <span className="text-xs font-mono font-bold text-[#c29b78] bg-[#c29b78]/10 px-2 py-0.5 rounded border border-[#c29b78]/20">
                    {draftRatingRange[0]} - {draftRatingRange[1]} Elo
                  </span>
                </div>

                <div className="py-2 px-1">
                  <Slider
                    min={600}
                    max={2600}
                    step={50}
                    value={draftRatingRange}
                    onValueChange={(val) => {
                      if (Array.isArray(val) && val.length === 2) {
                        setDraftRatingRange([
                          Math.min(val[0], val[1]),
                          Math.max(val[0], val[1]),
                        ]);
                      }
                    }}
                    className="w-full"
                  />
                </div>

                <div className="flex items-center justify-between text-[10px] text-[#a3a3a3] font-mono px-0.5">
                  <span>600 (Beginner)</span>
                  <span>1600 (Club)</span>
                  <span>2600 (Master)</span>
                </div>
              </div>

              {/* Tactical Themes: Pill-Shaped Toggle Badges */}
              <div className="flex flex-col gap-2">
                <span className="text-xs font-bold text-[#f5f5f5]">
                  Tactical Motifs & Themes
                </span>
                <div className="flex flex-wrap gap-2">
                  {AVAILABLE_THEMES.map((theme) => {
                    const isSelected = draftThemes.includes(theme.id);
                    return (
                      <button
                        key={theme.id}
                        type="button"
                        onClick={() => toggleTheme(theme.id)}
                        className="cursor-pointer"
                      >
                        <Badge
                          variant={isSelected ? "default" : "outline"}
                          className={`text-xs px-3 py-1.5 rounded-full font-medium transition-all ${
                            isSelected
                              ? "bg-[#c29b78] text-[#151413] border-[#c29b78] font-bold shadow-md shadow-[#c29b78]/30"
                              : "bg-[#151413] text-[#a3a3a3] border-white/10 hover:border-white/20 hover:text-white"
                          }`}
                        >
                          {isSelected && <Check className="w-3 h-3 mr-1 stroke-[3]" />}
                          <span>{theme.label}</span>
                        </Badge>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Bottom Actions: Reset & Apply */}
            <div className="flex items-center gap-3 pt-4 border-t border-white/10 mt-2">
              <button
                onClick={handleResetFilters}
                type="button"
                className="flex-1 h-11 rounded-xl bg-[#151413] hover:bg-[#2d2a28] border border-white/10 text-[#a3a3a3] hover:text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>

              <button
                onClick={handleApplyFilters}
                type="button"
                className="flex-[2] h-11 rounded-xl bg-[#c29b78] hover:bg-[#d4b08f] text-[#151413] font-black text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-[#c29b78]/30 active:scale-95"
              >
                <Sparkles className="w-4 h-4 fill-[#151413]" />
                <span>Apply Filters</span>
              </button>
            </div>
          </SheetContent>
        </Sheet>
      )}

      {/* 4. Purchase Paywall Modal for Practice Mode */}
      <QuotaPaywallModal
        isOpen={isPaywallOpen}
        onClose={() => setIsPaywallOpen(false)}
        onUpgradeComplete={async () => {
          await refreshSubscription();
          setIsPaywallOpen(false);
        }}
        userId={account?.id}
        resetsInMs={0}
        reason="practice"
      />
    </div>
  );
}
