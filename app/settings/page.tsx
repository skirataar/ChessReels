"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { SettingsModal } from "@/components/SettingsModal";
import { clearAllUserAndPuzzleCache } from "@/lib/puzzleCache";

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

  return (
    <div className="min-h-screen bg-[#0a0908] flex items-center justify-center">
      <SettingsModal
        isOpen={true}
        onClose={() => router.push("/play")}
        userAccount={account}
        onSignOut={() => {
          clearAllUserAndPuzzleCache(account?.id);
          router.replace("/");
        }}
      />
    </div>
  );
}
