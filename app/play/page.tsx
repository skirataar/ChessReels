"use client";

import React, { useEffect } from "react";
import PlayView from "@/components/PlayView";

export default function PlayPage() {
  useEffect(() => {
    // Route-Scoped Viewport Lock on /play:
    // Strictly lock native vertical page scrolling so vertical gestures only trigger puzzle reel swipes
    const prevHtmlOverflow = document.documentElement.style.overflow;
    const prevBodyOverflow = document.body.style.overflow;
    const prevBodyOverscroll = document.body.style.overscrollBehaviorY;
    const prevBodyPaddingBottom = document.body.style.paddingBottom;

    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    document.body.style.overscrollBehaviorY = "none";
    document.body.style.paddingBottom = "0px";

    return () => {
      // Cleanly remove/reset inline styles when navigating away to other routes (Profile, Practice, Settings)
      document.documentElement.style.overflow = prevHtmlOverflow;
      document.body.style.overflow = prevBodyOverflow;
      document.body.style.overscrollBehaviorY = prevBodyOverscroll;
      document.body.style.paddingBottom = prevBodyPaddingBottom;
    };
  }, []);

  return (
    <div className="h-dvh max-h-dvh w-full overflow-hidden overscroll-none select-none flex flex-col justify-between">
      <PlayView initialShowLanding={false} />
    </div>
  );
}

