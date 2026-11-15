"use client";

import React from "react";
import { ProfileView } from "@/components/ProfileView";

export interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentElo: number;
  streak: number;
  dailyStreak?: number;
  streakFreezes?: number;
  solveStreak?: number;
  guestId: string;
  userAccount?: {
    id: string;
    username: string;
    displayName?: string;
    avatar?: string;
    isCalibrated?: boolean;
    plan?: string;
    peakElo?: number;
    streak?: number;
    bestStreak?: number;
    email?: string;
    twoFactorEnabled?: boolean;
    targetElo?: number | null;
  } | null;
  onOpenAuth?: () => void;
  onOpenLanding?: () => void;
  onSignOut?: () => void;
  onResetElo?: () => void;
  onOpenUpgrade?: () => void;
  initialOpenSettings?: boolean;
}

export function ProfileModal({
  isOpen,
  onClose,
  currentElo,
  streak,
  dailyStreak = 0,
  streakFreezes = 0,
  solveStreak = 0,
  guestId,
  userAccount,
  onOpenAuth,
  onOpenLanding,
  onSignOut,
  onResetElo,
  onOpenUpgrade,
  initialOpenSettings = false,
}: ProfileModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-label="Tactics Profile"
    >
      <div className="w-full max-w-md h-[92vh] sm:h-[88vh] flex flex-col rounded-2xl bg-[#0a0908] border border-white/10 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <ProfileView
          currentElo={currentElo}
          streak={streak}
          dailyStreak={dailyStreak}
          streakFreezes={streakFreezes}
          solveStreak={solveStreak}
          guestId={guestId}
          userAccount={userAccount}
          onOpenAuth={onOpenAuth}
          onOpenLanding={onOpenLanding}
          onSignOut={onSignOut}
          onResetElo={onResetElo}
          onOpenUpgrade={onOpenUpgrade}
          onClose={onClose}
          initialOpenSettings={initialOpenSettings}
        />
      </div>
    </div>
  );
}
