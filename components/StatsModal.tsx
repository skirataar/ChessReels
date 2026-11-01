"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Zap,
  Flame,
  CheckCircle2,
  XCircle,
  BarChart2,
  Trophy,
  Sparkles,
} from "lucide-react";

interface StatsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentElo: number;
  dailyStreak: number;
  combo?: number;
  bestCombo?: number;
  totalSolved: number;
  totalFailed: number;
}

export function StatsModal({
  isOpen,
  onClose,
  currentElo,
  dailyStreak,
  combo = 0,
  bestCombo = 0,
  totalSolved,
  totalFailed,
}: StatsModalProps) {
  const totalAttempted = totalSolved + totalFailed;
  const winRate =
    totalAttempted > 0 ? Math.round((totalSolved / totalAttempted) * 100) : 0;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        data-testid="stats-modal-dialog"
        className="bg-[#18181B] text-[#e5e1e4] border border-white/10 max-w-sm w-full p-5 shadow-2xl rounded-2xl"
      >
        <DialogHeader className="flex flex-col gap-1 items-start text-left">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-[#4edea3]/15 text-[#4edea3]">
              <BarChart2 className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-white tracking-tight">
                Tactical Performance
              </DialogTitle>
              <DialogDescription className="text-xs text-[#bbcabf]">
                Your personal chess mastery analytics
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Tactical Metric Grid */}
        <div className="grid grid-cols-2 gap-2.5 mt-2">
          {/* Current Elo */}
          <div
            data-testid="stat-current-elo"
            className="p-3 rounded-xl bg-[#201f21] border border-white/5 flex flex-col gap-1.5 shadow-inner"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-[#bbcabf] uppercase tracking-wider">
                Current Elo
              </span>
              <Zap className="w-4 h-4 text-[#4edea3]" />
            </div>
            <div className="text-xl font-black text-white tracking-tight">
              {currentElo}
            </div>
          </div>

          {/* Daily Streak (Days logged in and played) */}
          <div
            data-testid="stat-daily-streak"
            className="p-3 rounded-xl bg-[#201f21] border border-white/5 flex flex-col gap-1.5 shadow-inner"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-[#bbcabf] uppercase tracking-wider">
                Daily Streak
              </span>
              <Flame className="w-4 h-4 text-[#ffb95f]" />
            </div>
            <div className="text-xl font-black text-[#ffb95f] tracking-tight">
              {dailyStreak} {dailyStreak === 1 ? "Day" : "Days"}
            </div>
          </div>

          {/* Solve Combo (Consecutive right answers) */}
          <div
            data-testid="stat-solve-combo"
            className="p-3 rounded-xl bg-[#201f21] border border-[#4edea3]/20 flex flex-col gap-1.5 shadow-inner col-span-2"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-[#4edea3] uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                Solve Combo (Consecutive Right)
              </span>
              <span className="text-[10px] font-mono text-[#bbcabf]">
                Best: {Math.max(combo, bestCombo)}
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-white tracking-tight">
                {combo}
              </span>
              <span className="text-xs text-[#bbcabf] font-medium">
                {combo === 1 ? "in a row" : "in a row without mistake"}
              </span>
            </div>
          </div>

          {/* Total Solved */}
          <div
            data-testid="stat-total-solved"
            className="p-3 rounded-xl bg-[#201f21] border border-white/5 flex flex-col gap-1.5 shadow-inner"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-[#bbcabf] uppercase tracking-wider">
                Total Solved
              </span>
              <CheckCircle2 className="w-4 h-4 text-[#10b981]" />
            </div>
            <div className="text-xl font-black text-[#4edea3] tracking-tight">
              {totalSolved}
            </div>
          </div>

          {/* Total Failed */}
          <div
            data-testid="stat-total-failed"
            className="p-3 rounded-xl bg-[#201f21] border border-white/5 flex flex-col gap-1.5 shadow-inner"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-[#bbcabf] uppercase tracking-wider">
                Failed
              </span>
              <XCircle className="w-4 h-4 text-[#EF4444]" />
            </div>
            <div className="text-xl font-black text-[#EF4444] tracking-tight">
              {totalFailed}
            </div>
          </div>
        </div>

        {/* Tactical Accuracy / Win Rate Bar */}
        <div className="p-3 rounded-xl bg-[#201f21] border border-white/5 flex flex-col gap-2 mt-1">
          <div className="flex items-center justify-between text-xs font-semibold">
            <span className="text-[#bbcabf] flex items-center gap-1.5">
              <Trophy className="w-3.5 h-3.5 text-[#ffb95f]" />
              Solve Accuracy
            </span>
            <span className="text-white font-bold">{winRate}%</span>
          </div>

          <div className="w-full h-2 rounded-full bg-[#2a2a2c] overflow-hidden flex">
            <div
              className="h-full bg-gradient-to-r from-[#10b981] to-[#4edea3] transition-all duration-500 rounded-full"
              style={{ width: `${winRate}%` }}
            />
          </div>
          <div className="text-[10px] text-[#bbcabf] text-right">
            {totalAttempted} total {totalAttempted === 1 ? "puzzle" : "puzzles"} attempted
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
