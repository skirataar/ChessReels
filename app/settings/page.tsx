"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { SettingsView } from "@/components/SettingsView";
import { clearAllUserAndPuzzleCache } from "@/lib/puzzleCache";
import posthog from "posthog-js";

export default function SettingsPage() {
  const router = useRouter();
  const [account, setAccount] = useState<any>(null);

  useEffect(() => {
    try {
      const accRaw = window.localStorage.getItem("chess_reel_account");
      if (accRaw) {
        setAccount(JSON.parse(accRaw));
      }
    } catch {}
  }, []);

  const handleSignOut = () => {
    posthog.reset();
    clearAllUserAndPuzzleCache(account?.id);
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

  return (
    <main className="min-h-screen bg-[#0a0908] flex flex-col items-center">
      <div className="w-full max-w-md min-h-screen flex flex-col bg-[#0a0908] border-x border-white/[0.04]">
        <SettingsView
          onBack={() => router.push("/play")}
          userAccount={account}
          onSignOut={handleSignOut}
          onOpenUpgrade={() => router.push("/play")}
        />
      </div>
    </main>
  );
}
