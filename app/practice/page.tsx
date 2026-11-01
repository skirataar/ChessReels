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
import { SlidersHorizontal, RefreshCw, RotateCcw, Check, Sparkles, Filter } from "lucide-react";

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

export default function PracticePage() {
  const router = useRouter();

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
  const [currentPuzzle, setCurrentPuzzle] = useState<PuzzleData | null>(null);
  const [puzzleStatus, setPuzzleStatus] = useState<PuzzleStatus>("loading");
  const [isLoading, setIsLoading] = useState<boolean>(true);

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

  // Fetch puzzle based on filters
  const fetchPracticePuzzle = useCallback(
    async (
      overrideMin?: number,
      overrideMax?: number,
      overrideThemes?: string[]
    ) => {
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
        } else {
          // Fallback if no specific puzzle matches strict theme
          const fallbackRes = await fetch(
            `/api/puzzle/random?minRating=${queryMin}&maxRating=${queryMax}`
          );
          if (fallbackRes.ok) {
            const data = (await fallbackRes.json()) as PuzzleData;
            setCurrentPuzzle(data);
          }
        }
      } catch (err) {
        console.error("Failed to fetch practice puzzle:", err);
      } finally {
        setIsLoading(false);
      }
    },
    [minRating, maxRating, selectedThemes]
  );

  // Initial fetch on mount
  const initialFetchDone = useRef(false);
  useEffect(() => {
    if (!initialFetchDone.current) {
      initialFetchDone.current = true;
      fetchPracticePuzzle();
    }
  }, [fetchPracticePuzzle]);

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
      {/* 1. Header with Title & Filter CTA */}
      <header className="sticky top-0 z-30 bg-[#151413]/90 backdrop-blur-xl border-b border-white/10 px-4 py-3">
        <div className="max-w-md mx-auto flex items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-base font-black tracking-tight text-[#f5f5f5]">
                Practice Mode
              </span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-[#c29b78]/20 text-[#c29b78] border border-[#c29b78]/30">
                Unranked
              </span>
            </div>
            <p className="text-[11px] text-[#a3a3a3]">
              Targeted tactics training • No rating penalty
            </p>
          </div>

          {/* Large Filter Puzzles Button */}
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
        </div>

        {/* Active Filters Pill Bar */}
        {(selectedThemes.length > 0 ||
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

      {/* 2. Main Gameplay Theater */}
      <main className="flex-1 flex flex-col items-center justify-center p-3 pb-8 max-w-sm sm:max-w-md mx-auto w-full">
        {isLoading || !currentPuzzle ? (
          <div className="w-full flex flex-col items-center justify-center gap-4 py-20">
            <div className="w-12 h-12 rounded-full border-3 border-[#c29b78] border-t-transparent animate-spin" />
            <p className="text-xs text-[#a3a3a3] font-mono uppercase tracking-wider">
              Finding filtered tactics...
            </p>
          </div>
        ) : (
          <PuzzleCard
            puzzle={currentPuzzle}
            status={puzzleStatus}
            currentElo={1200}
            streak={0}
            lastEloChange={null}
            mode="practice"
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

      {/* 3. shadcn Sheet: Bottom Drawer for Practice Filters */}
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
    </div>
  );
}
