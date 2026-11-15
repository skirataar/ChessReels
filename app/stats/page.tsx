"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter } from "next/navigation";
import { ProfileView } from "@/components/ProfileView";
import { useStreak } from "@/lib/useStreak";
import { clearGuestLocalSession, isGuestAccount } from "@/lib/guestAccount";
import { clearAllUserAndPuzzleCache } from "@/lib/puzzleCache";
import posthog from "posthog-js";

function ProfileStatsContent() {
  const router = useRouter();
  const {
    dailyStreak,
    streakFreezes,
    combo,
  } = useStreak();

  const [currentElo, setCurrentElo] = useState<number>(1000);
  const [userAccount, setUserAccount] = useState<any>(null);
  const [isMounted, setIsMounted] = useState<boolean>(false);
  const [initialOpenSettings, setInitialOpenSettings] = useState<boolean>(false);

  useEffect(() => {
    setIsMounted(true);
    try {
      if (typeof window !== "undefined") {
        const params = new URLSearchParams(window.location.search);
        if (params.get("open") === "settings") {
          setInitialOpenSettings(true);
        }
      }

      const savedElo = window.localStorage.getItem("chess_reel_elo");
      if (savedElo) {
        const parsed = parseInt(savedElo, 10);
        if (!isNaN(parsed) && parsed > 0) setCurrentElo(parsed);
      }

      const savedAccount = window.localStorage.getItem("chess_reel_account");
      if (savedAccount) {
        const parsed = JSON.parse(savedAccount);
        if (isGuestAccount(parsed)) {
          clearGuestLocalSession();
          router.replace("/");
          return;
        }
        setUserAccount(parsed);
        if (parsed.elo) setCurrentElo(parsed.elo);
      } else {
        router.replace("/");
        return;
      }
    } catch {}
  }, [router]);

  const handleSignOut = () => {
    const oldUserId = userAccount?.id;
    posthog.reset();
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

  const handleResetElo = () => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem("chess_reel_elo", "1000");
      window.dispatchEvent(new Event("account-updated"));
    }
  };

  if (!isMounted) {
    return (
      <div className="min-h-screen bg-[#0a0908] flex items-center justify-center">
        <div className="w-6 h-6 rounded-full border-2 border-[#c29b78]/20 border-t-[#c29b78] animate-spin" />
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#0a0908] flex flex-col items-center">
      <div className="w-full max-w-md min-h-screen flex flex-col bg-[#0a0908] border-x border-white/[0.04]">
        <ProfileView
          currentElo={currentElo}
          dailyStreak={dailyStreak}
          streakFreezes={streakFreezes}
          solveStreak={combo}
          userAccount={userAccount}
          initialOpenSettings={initialOpenSettings}
          onSignOut={handleSignOut}
          onResetElo={handleResetElo}
          onOpenUpgrade={() => router.push("/play")}
        />
      </div>
    </main>
  );
}

export default function ProfileStatsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#0a0908] flex items-center justify-center">
          <div className="w-6 h-6 rounded-full border-2 border-[#c29b78]/20 border-t-[#c29b78] animate-spin" />
        </div>
      }
    >
      <ProfileStatsContent />
    </Suspense>
  );
}
