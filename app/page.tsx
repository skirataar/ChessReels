"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import PlayPage from "./play/page";

export default function RootPage() {
  const router = useRouter();
  const [shouldRenderLanding, setShouldRenderLanding] = useState<boolean | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.removeItem("chess_reel_preview_guest");
    } catch {}
    const hasAccount = window.localStorage.getItem("chess_reel_account");
    if (hasAccount) {
      router.replace("/play");
    } else {
      setShouldRenderLanding(true);
    }
  }, [router]);

  if (shouldRenderLanding === true) {
    return <PlayPage initialShowLanding={true} />;
  }

  return (
    <div className="min-h-screen bg-[#151413] flex flex-col items-center justify-center gap-3">
      <div className="w-8 h-8 border-2 border-[#c29b78] border-t-transparent rounded-full animate-spin" />
      <span className="text-xs text-[#a3a3a3] font-mono uppercase tracking-wider">
        Loading Chess Reel...
      </span>
    </div>
  );
}
