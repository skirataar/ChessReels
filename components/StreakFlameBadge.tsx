"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Flame, Snowflake } from "lucide-react";
import { getTodayDateString } from "@/lib/useStreak";

export interface StreakFlameBadgeProps {
  streak: number;
  isFrozenState?: boolean;
  isIgniting?: boolean;
  hasSolvedToday?: boolean;
  lastSolvedDate?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
  testId?: string;
  flameTestId?: string;
  onClick?: () => void;
}

export function StreakFlameBadge({
  streak,
  isFrozenState = false,
  isIgniting: controlledIgniting,
  hasSolvedToday,
  lastSolvedDate,
  size = "sm",
  className = "",
  testId = "header-streak-indicator",
  flameTestId = "header-flame-icon",
  onClick,
}: StreakFlameBadgeProps) {
  // Determine if the user has completed at least one solve today
  // If hasSolvedToday is explicitly passed, use it.
  // Otherwise, derive from lastSolvedDate if provided, or default to true for backward compatibility.
  const resolvedHasSolvedToday = useMemo(() => {
    if (typeof hasSolvedToday === "boolean") return hasSolvedToday;
    if (lastSolvedDate !== undefined) {
      if (!lastSolvedDate) return false;
      const today = getTodayDateString();
      return lastSolvedDate === today;
    }
    return true;
  }, [hasSolvedToday, lastSolvedDate]);

  const prevStreakRef = useRef(streak);
  const prevFrozenRef = useRef(isFrozenState);
  const prevSolvedTodayRef = useRef(resolvedHasSolvedToday);
  const [animationTick, setAnimationTick] = useState(0);

  // Trigger animation tick whenever streak increments, frozen state toggles,
  // or when the flame ignites upon solving the first puzzle of the day (!prev -> true)
  useEffect(() => {
    const streakChanged = streak !== prevStreakRef.current;
    const frozenChanged = isFrozenState !== prevFrozenRef.current;
    const firstSolveToday = !prevSolvedTodayRef.current && resolvedHasSolvedToday;

    if (streakChanged || frozenChanged || firstSolveToday) {
      setAnimationTick((prev) => prev + 1);
    }
    prevStreakRef.current = streak;
    prevFrozenRef.current = isFrozenState;
    prevSolvedTodayRef.current = resolvedHasSolvedToday;
  }, [streak, isFrozenState, resolvedHasSolvedToday]);

  useEffect(() => {
    if (controlledIgniting) {
      setAnimationTick((prev) => prev + 1);
    }
  }, [controlledIgniting]);

  // Four Visual States:
  // State A: Hollow (streak === 0)
  // State B: Icy Blue Frozen (streak >= 1 && isFrozenState === true)
  // State C: Unlit / Dormant Next-Day (streak >= 1 && !isFrozenState && !resolvedHasSolvedToday)
  // State D: Ignited Fired Up (streak >= 1 && !isFrozenState && resolvedHasSolvedToday)
  const isHollow = streak === 0;
  const isFrozen = streak >= 1 && isFrozenState;
  const isUnlit = streak >= 1 && !isFrozenState && !resolvedHasSolvedToday;
  const isIgnited = streak >= 1 && !isFrozenState && resolvedHasSolvedToday;

  const flameState = isHollow
    ? "hollow"
    : isFrozen
    ? "frozen"
    : isUnlit
    ? "unlit"
    : "ignited";

  // Icon and text sizing
  const iconSizeClass =
    size === "lg" ? "w-6 h-6" : size === "md" ? "w-4 h-4" : "w-3.5 h-3.5";
  const textClass =
    size === "lg" ? "text-base font-black" : size === "md" ? "text-sm font-bold" : "text-xs font-bold";
  const rollHeight =
    size === "lg" ? "h-[22px] leading-[22px]" : size === "md" ? "h-[20px] leading-[20px]" : "h-[16px] leading-[16px]";
  const rollOffset = size === "lg" ? 18 : size === "md" ? 16 : 14;

  return (
    <div
      data-testid={testId}
      suppressHydrationWarning
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      className={`inline-flex items-center gap-1 ${
        onClick
          ? "cursor-pointer hover:opacity-90 active:scale-[0.98]"
          : "cursor-default"
      } select-none transition-all duration-300 bg-transparent border-none p-0 ${className}`}
      title={
        isFrozen
          ? `Streak Protected by Freeze: ${streak} ${streak === 1 ? "day" : "days"} (Click to view calendar)`
          : isUnlit
          ? `Streak Active: ${streak} ${streak === 1 ? "day" : "days"} (Solve today to ignite flame!)`
          : `Daily Streak: ${streak} ${streak === 1 ? "day" : "days"} (Click to view calendar)`
      }
    >
      {/* Screen-reader text for accessibility and test suites */}
      <span className="sr-only">🔥</span>

      <div className="relative flex items-center justify-center shrink-0">
        {/* Expanding pulse ring (cyan on frozen, golden on ignited) */}
        <AnimatePresence>
          {animationTick > 0 && (
            <motion.div
              key={`pulse-${animationTick}`}
              data-testid="streak-ignition-pulse"
              initial={{ scale: 1, opacity: 0.6 }}
              animate={{ scale: 1.8, opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.55, ease: "easeOut" }}
              className={`absolute inset-0 rounded-full pointer-events-none ${
                isFrozen ? "bg-sky-400/50" : "bg-[#f59e0b]/50"
              }`}
            />
          )}
        </AnimatePresence>

        {/* Orbiting / accent snowflakes when streak is frozen */}
        {isFrozen && (
          <>
            <Snowflake
              data-testid="frozen-snowflake-top"
              className="w-2.5 h-2.5 text-sky-300 animate-pulse absolute -top-1.5 -right-1.5 pointer-events-none drop-shadow-[0_0_4px_rgba(56,189,248,0.8)]"
              strokeWidth={2}
            />
            <Snowflake
              data-testid="frozen-snowflake-bottom"
              className="w-2 h-2 text-sky-300 animate-pulse absolute -bottom-1 -left-1 pointer-events-none opacity-80"
              strokeWidth={2}
            />
          </>
        )}

        {/* Flame spring pop & rotation animation keyed on animationTick */}
        <motion.div
          key={`flame-pop-${animationTick}`}
          initial={{ scale: 1, rotate: 0 }}
          animate={
            animationTick > 0
              ? {
                  scale: [1, 1.4, 0.92, 1.12, 1],
                  rotate: [0, -8, 8, 0],
                  transition: { duration: 0.55, ease: "easeOut" },
                }
              : { scale: 1, rotate: 0 }
          }
          className="flex items-center justify-center shrink-0"
        >
          <Flame
            data-testid={flameTestId}
            data-flame-state={flameState}
            fill={isHollow || isUnlit ? "none" : isFrozen ? "#38bdf8" : "#f59e0b"}
            stroke={isHollow || isUnlit ? "#78716c" : isFrozen ? "#7dd3fc" : "#fbbf24"}
            strokeWidth={isHollow || isUnlit ? 1.75 : 1.5}
            className={`${iconSizeClass} shrink-0 transition-colors duration-300 ${
              isFrozen
                ? "drop-shadow-[0_0_8px_rgba(56,189,248,0.6)]"
                : isIgnited
                ? "drop-shadow-[0_0_8px_rgba(245,158,11,0.55)]"
                : ""
            }`}
          />
        </motion.div>
      </div>

      {/* Vertical rolling streak number counter keyed on streak & isFrozenState */}
      <span className={`relative inline-block overflow-hidden ${rollHeight} min-w-[9px]`}>
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={`${streak}-${isFrozenState}-${flameState}`}
            data-testid="streak-number-display"
            initial={{ y: rollOffset, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -rollOffset, opacity: 0 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className={`inline-block ${textClass} ${
              isHollow
                ? "text-[#78716c]"
                : isUnlit
                ? "text-[#a8a29e]"
                : isFrozen
                ? "text-[#e0f2fe]"
                : "text-[#f5f2eb]"
            }`}
            suppressHydrationWarning
          >
            {streak}
          </motion.span>
        </AnimatePresence>
      </span>
    </div>
  );
}
