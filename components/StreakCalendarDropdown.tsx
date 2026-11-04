"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  Snowflake,
  Flame,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  X,
} from "lucide-react";
import {
  getTodayDateString,
  addCalendarDays,
  getCalendarDaysDiff,
} from "@/lib/useStreak";

export interface StreakCalendarDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  streak: number;
  streakFreezes: number;
  perfectWeekCounter?: number;
  isFrozenState?: boolean;
  lastSolvedDate?: string | null;
  todayDate?: string;
  activeDates?: string[];
  frozenDates?: string[];
  align?: "left" | "right" | "center";
}

interface CalendarDay {
  dayNumber: number;
  dateStr: string; // YYYY-MM-DD
  isCurrentMonth: boolean;
  isToday: boolean;
  isActive: boolean;
  isFrozen: boolean;
  isFuture: boolean;
}

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function getDaysInMonth(year: number, month: number): number {
  const isLeap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
  const days = [31, isLeap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return days[month] || 30;
}

function getFirstDayOfWeek(year: number, month: number): number {
  // UTC deterministic day of week (Monday = 0 ... Sunday = 6)
  const d = new Date(Date.UTC(year, month, 1));
  return (d.getUTCDay() + 6) % 7;
}

export function StreakCalendarDropdown({
  isOpen,
  onClose,
  streak,
  streakFreezes,
  perfectWeekCounter = 0,
  isFrozenState = false,
  lastSolvedDate,
  todayDate,
  activeDates = [],
  frozenDates = [],
  align = "left",
}: StreakCalendarDropdownProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [todayStr, setTodayStr] = useState<string>(todayDate || "2026-11-04");
  const [viewYear, setViewYear] = useState<number>(2026);
  const [viewMonth, setViewMonth] = useState<number>(10); // November (0-indexed)

  useEffect(() => {
    const today = todayDate || getTodayDateString();
    setTodayStr(today);
    const [y, m] = today.split("-").map(Number);
    if (y && m) {
      setViewYear(y);
      setViewMonth(m - 1);
    }
  }, [isOpen, todayDate]);

  // Auto-clamp dropdown within viewport boundaries
  useEffect(() => {
    if (!isOpen || !containerRef.current) return;
    const adjustPosition = () => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const margin = 12;
      if (rect.right > window.innerWidth - margin) {
        const overflow = rect.right - (window.innerWidth - margin);
        containerRef.current.style.left = `-${overflow}px`;
      } else if (rect.left < margin) {
        const underflow = margin - rect.left;
        containerRef.current.style.left = `${underflow}px`;
      }
    };

    const frame = requestAnimationFrame(adjustPosition);
    return () => cancelAnimationFrame(frame);
  }, [isOpen]);

  // Click outside and Escape key listeners
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  // Synthesize active and frozen sets
  const { activeSet, frozenSet } = useMemo(() => {
    const aSet = new Set<string>(activeDates);
    const fSet = new Set<string>(frozenDates);

    // If streak is frozen, yesterday was preserved by a freeze
    if (isFrozenState) {
      const yesterday = addCalendarDays(todayStr, -1);
      fSet.add(yesterday);

      // And consecutive solve days prior to yesterday
      const baseDate = lastSolvedDate || yesterday;
      for (let i = 0; i < Math.max(1, streak); i++) {
        aSet.add(addCalendarDays(baseDate, -(i + 1)));
      }
    } else if (streak > 0 && lastSolvedDate) {
      // Current active streak days ending at lastSolvedDate
      for (let i = 0; i < streak; i++) {
        aSet.add(addCalendarDays(lastSolvedDate, -i));
      }
    }

    return { activeSet: aSet, frozenSet: fSet };
  }, [streak, isFrozenState, lastSolvedDate, activeDates, frozenDates, todayStr]);

  // Month navigation
  const handlePrevMonth = () => {
    setViewMonth((prev) => {
      if (prev === 0) {
        setViewYear((y) => y - 1);
        return 11;
      }
      return prev - 1;
    });
  };

  const handleNextMonth = () => {
    setViewMonth((prev) => {
      if (prev === 11) {
        setViewYear((y) => y + 1);
        return 0;
      }
      return prev + 1;
    });
  };

  const handleGoToToday = () => {
    const [y, m] = todayStr.split("-").map(Number);
    if (y && m) {
      setViewYear(y);
      setViewMonth(m - 1);
    }
  };

  // Format Month Title (e.g., "November 2026")
  const monthTitle = useMemo(() => {
    return `${MONTH_NAMES[viewMonth] || "November"} ${viewYear}`;
  }, [viewYear, viewMonth]);

  // Check if viewing current month
  const isViewingCurrentMonth = useMemo(() => {
    const [y, m] = todayStr.split("-").map(Number);
    return y === viewYear && m - 1 === viewMonth;
  }, [todayStr, viewYear, viewMonth]);

  // Build calendar matrix (Monday-first: M T W T F S S)
  const calendarWeeks = useMemo(() => {
    const daysInMonth = getDaysInMonth(viewYear, viewMonth);
    // Monday = 0, Tuesday = 1, ..., Sunday = 6
    const firstDayIndex = getFirstDayOfWeek(viewYear, viewMonth);

    const weeks: CalendarDay[][] = [];
    let currentWeek: CalendarDay[] = [];

    // Prepend empty slots for days before 1st of month
    for (let i = 0; i < firstDayIndex; i++) {
      currentWeek.push({
        dayNumber: 0,
        dateStr: "",
        isCurrentMonth: false,
        isToday: false,
        isActive: false,
        isFrozen: false,
        isFuture: false,
      });
    }

    // Days of current month
    for (let day = 1; day <= daysInMonth; day++) {
      const mStr = String(viewMonth + 1).padStart(2, "0");
      const dStr = String(day).padStart(2, "0");
      const dateStr = `${viewYear}-${mStr}-${dStr}`;

      const isToday = dateStr === todayStr;
      const isFuture = getCalendarDaysDiff(todayStr, dateStr) > 0;
      const isFrozen = frozenSet.has(dateStr);
      const isActive = activeSet.has(dateStr);

      currentWeek.push({
        dayNumber: day,
        dateStr,
        isCurrentMonth: true,
        isToday,
        isActive,
        isFrozen,
        isFuture,
      });

      if (currentWeek.length === 7) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
    }

    // Append remaining slots if week is incomplete
    if (currentWeek.length > 0) {
      while (currentWeek.length < 7) {
        currentWeek.push({
          dayNumber: 0,
          dateStr: "",
          isCurrentMonth: false,
          isToday: false,
          isActive: false,
          isFrozen: false,
          isFuture: false,
        });
      }
      weeks.push(currentWeek);
    }

    return weeks;
  }, [viewYear, viewMonth, todayStr, activeSet, frozenSet]);

  const alignmentClass =
    align === "right"
      ? "right-0"
      : align === "center"
      ? "left-1/2 -translate-x-1/2"
      : "left-0";

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={containerRef}
          data-testid="streak-calendar-dropdown"
          initial={{ opacity: 0, scale: 0.95, y: -6 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -6 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
          className={`fixed top-12 left-1/2 -translate-x-1/2 sm:absolute sm:top-full sm:left-0 sm:translate-x-0 mt-2 z-50 w-[310px] sm:w-[330px] max-w-[calc(100vw-24px)] rounded-2xl bg-[#161412]/98 border border-white/15 p-4 shadow-2xl backdrop-blur-xl text-white select-none`}
        >
          {/* Header: Centered Month Title & Controls */}
          <div className="flex items-center justify-between pb-3 mb-2 border-b border-white/10">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="w-7 h-7 rounded-lg flex items-center justify-center bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-colors cursor-pointer"
              title="Previous month"
              aria-label="Previous month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-1.5">
              <span className="text-sm font-black tracking-wide lowercase first-letter:uppercase text-[#f5f2eb]">
                {monthTitle}
              </span>
              {!isViewingCurrentMonth && (
                <button
                  type="button"
                  onClick={handleGoToToday}
                  className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-white/5 hover:bg-white/10 text-[#c29b78] border border-white/10 transition-colors"
                  title="Jump to today"
                >
                  Today
                </button>
              )}
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleNextMonth}
                className="w-7 h-7 rounded-lg flex items-center justify-center bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-colors cursor-pointer"
                title="Next month"
                aria-label="Next month"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={onClose}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                title="Close"
                aria-label="Close"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Weekday Row (M, T, W, T, F, S, S) */}
          <div className="grid grid-cols-7 mb-1 text-center">
            {["M", "T", "W", "T", "F", "S", "S"].map((d, idx) => (
              <div
                key={`weekday-${idx}`}
                className="text-[11px] font-black text-white/40 py-1"
              >
                {d}
              </div>
            ))}
          </div>

          {/* Monthly Calendar Grid with Connected Streak Tracks & Frozen Drops */}
          <div className="space-y-1.5">
            {calendarWeeks.map((week, weekIdx) => {
              const hasMonthDays = week.some((d) => d.isCurrentMonth);
              if (!hasMonthDays) return null;

              // Compute contiguous active streak runs in this week row
              const activeRuns: { start: number; end: number }[] = [];
              let currentRunStart: number | null = null;

              week.forEach((day, idx) => {
                if (day.isCurrentMonth && day.isActive) {
                  if (currentRunStart === null) currentRunStart = idx;
                } else {
                  if (currentRunStart !== null) {
                    activeRuns.push({ start: currentRunStart, end: idx - 1 });
                    currentRunStart = null;
                  }
                }
              });
              if (currentRunStart !== null) {
                activeRuns.push({ start: currentRunStart, end: week.length - 1 });
              }

              return (
                <div
                  key={`week-${weekIdx}`}
                  className="relative h-8 sm:h-9 flex items-center"
                >
                  {/* Row Background Track (Matching Duolingo capsule track) */}
                  <div className="absolute inset-x-0 inset-y-0.5 rounded-full bg-white/[0.04] border border-white/[0.04] pointer-events-none z-0" />

                  {/* Contiguous Active Streak Bars (Solid Vibrant Orange Capsule) */}
                  {activeRuns.map((run) => {
                    const leftPct = (run.start / 7) * 100;
                    const widthPct = ((run.end - run.start + 1) / 7) * 100;
                    return (
                      <React.Fragment key={`run-group-${run.start}-${run.end}`}>
                        <div
                          className="absolute inset-y-0.5 rounded-full bg-gradient-to-r from-[#ff9800] via-[#fb8c00] to-[#f57c00] shadow-md shadow-orange-500/25 border border-amber-300/30 pointer-events-none z-0 transition-all"
                          style={{
                            left: `calc(${leftPct}% + 1px)`,
                            width: `calc(${widthPct}% - 2px)`,
                          }}
                        />

                        {/* Little diamond sparkles between consecutive active days */}
                        {Array.from({ length: run.end - run.start }).map((_, i) => {
                          const colBoundary = run.start + i + 1;
                          return (
                            <span
                              key={`sparkle-${colBoundary}`}
                              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-10 text-[8px] text-white/80 pointer-events-none select-none font-bold"
                              style={{ left: `${(colBoundary / 7) * 100}%` }}
                            >
                              ✦
                            </span>
                          );
                        })}
                      </React.Fragment>
                    );
                  })}

                  {/* Day Cells Grid */}
                  <div className="grid grid-cols-7 w-full h-full relative z-10 items-center">
                    {week.map((day, colIdx) => {
                      if (!day.isCurrentMonth) {
                        return (
                          <div
                            key={`empty-${colIdx}`}
                            className="w-full h-full flex items-center justify-center text-[11px] text-white/5 pointer-events-none"
                          />
                        );
                      }

                      return (
                        <div
                          key={`day-${day.dateStr}`}
                          className="w-full h-full relative flex items-center justify-center select-none"
                        >
                          {/* Day Number or Icy Frozen Droplet */}
                          {day.isFrozen ? (
                            // Duolingo Icy Blue Droplet with gloss shine and pointed drip tail
                            <div
                              className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-b from-[#38bdf8] via-[#0ea5e9] to-[#0284c7] text-white flex items-center justify-center font-black text-xs shadow-md shadow-sky-500/40 relative z-10 cursor-help"
                              title="Protected by Streak Freeze"
                            >
                              {/* Specular gloss highlight arc */}
                              <div className="absolute top-1 left-1.5 w-2 h-1 rounded-full bg-white/40 -rotate-12 pointer-events-none" />
                              {/* Pointed bottom drip tail */}
                              <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-[#0284c7] rotate-45 rounded-[1px] pointer-events-none" />
                              <span className="relative z-10 drop-shadow-sm">{day.dayNumber}</span>
                            </div>
                          ) : day.isActive ? (
                            // Active Day in Streak
                            <span className="relative z-10 font-black text-white text-xs sm:text-sm drop-shadow-sm">
                              {day.dayNumber}
                            </span>
                          ) : day.isToday ? (
                            // Today, not yet solved: outlined amber ring
                            <div
                              className="w-7 h-7 sm:w-7.5 sm:h-7.5 rounded-full border-2 border-amber-400 text-amber-400 flex items-center justify-center font-bold text-xs"
                              title="Today — Solve to advance streak!"
                            >
                              <span>{day.dayNumber}</span>
                            </div>
                          ) : (
                            // Regular unplayed / missed / future day
                            <span
                              className={`relative z-10 text-xs font-bold ${
                                day.isFuture
                                  ? "text-white/20 font-medium"
                                  : "text-[#f59e0b]"
                              }`}
                            >
                              {day.dayNumber}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* ------------------------------------------------------------- */}
          {/* BOTTOM SECTION: Amount of Streak Freezes & Protection Status */}
          {/* ------------------------------------------------------------- */}
          <div className="pt-3 border-t border-white/10 mt-3 space-y-2.5">
            {/* Header: Title and Freezes Count */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                <Snowflake className="w-4 h-4 text-sky-400 shrink-0" strokeWidth={2} />
                <span>Streak Freezes</span>
              </div>
              <span
                data-testid="dropdown-freeze-count"
                className="text-xs font-mono font-bold text-sky-300 bg-sky-500/10 px-2 py-0.5 rounded-full border border-sky-400/25"
              >
                {streakFreezes} / 2 Available
              </span>
            </div>

            {/* Visual Freeze Capsules (2 Slots) */}
            <div className="grid grid-cols-2 gap-2">
              {/* Slot 1 */}
              <div
                className={`p-2 rounded-xl flex items-center gap-2 border transition-all ${
                  streakFreezes >= 1
                    ? "bg-sky-500/15 border-sky-400/30 text-sky-200"
                    : "bg-white/[0.03] border-white/5 text-white/30"
                }`}
              >
                <div
                  className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${
                    streakFreezes >= 1
                      ? "bg-sky-400/25 text-sky-300"
                      : "bg-white/5 text-white/20"
                  }`}
                >
                  <Snowflake className="w-3.5 h-3.5" strokeWidth={1.75} />
                </div>
                <div className="min-w-0">
                  <div className="text-[11px] font-bold truncate">Freeze 1</div>
                  <div className="text-[9px] opacity-75 truncate">
                    {streakFreezes >= 1 ? "Equipped • Ready" : "Used • Empty"}
                  </div>
                </div>
              </div>

              {/* Slot 2 */}
              <div
                className={`p-2 rounded-xl flex items-center gap-2 border transition-all ${
                  streakFreezes >= 2
                    ? "bg-sky-500/15 border-sky-400/30 text-sky-200"
                    : "bg-white/[0.03] border-white/5 text-white/30"
                }`}
              >
                <div
                  className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${
                    streakFreezes >= 2
                      ? "bg-sky-400/25 text-sky-300"
                      : "bg-white/5 text-white/20"
                  }`}
                >
                  <Snowflake className="w-3.5 h-3.5" strokeWidth={1.75} />
                </div>
                <div className="min-w-0">
                  <div className="text-[11px] font-bold truncate">Freeze 2</div>
                  <div className="text-[9px] opacity-75 truncate">
                    {streakFreezes >= 2 ? "Equipped • Ready" : "Used • Empty"}
                  </div>
                </div>
              </div>
            </div>

            {/* Progress to next freeze - hidden when at full 2/2 capacity */}
            {streakFreezes < 2 && (
              <div className="space-y-1 pt-0.5">
                <div className="flex items-center justify-between text-[10px] text-white/50">
                  <span>Earn next freeze (7-day streak)</span>
                  <span className="font-mono text-white/70">
                    {perfectWeekCounter}/7 Days
                  </span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-sky-400 to-sky-300 transition-all duration-300"
                    style={{
                      width: `${Math.min(100, (perfectWeekCounter / 7) * 100)}%`,
                    }}
                  />
                </div>
              </div>
            )}

            {/* Explainer Alert / Status Banner */}
            {isFrozenState ? (
              <div className="p-2 rounded-xl bg-sky-950/60 border border-sky-400/30 text-sky-200 text-[11px] flex items-center gap-2">
                <Snowflake className="w-3.5 h-3.5 text-sky-300 shrink-0 animate-pulse" />
                <span>Streak is frozen today! Solve a puzzle to thaw and advance.</span>
              </div>
            ) : streakFreezes === 0 ? (
              <div className="p-2 rounded-xl bg-rose-950/40 border border-rose-500/25 text-rose-300 text-[11px] flex items-center gap-2">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                <span>0 freezes left. Solve daily to prevent losing your streak!</span>
              </div>
            ) : (
              <div className="text-[10px] text-white/40 text-center flex items-center justify-center gap-1">
                <span>Missed days are protected by streak freezes (up to 2).</span>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
