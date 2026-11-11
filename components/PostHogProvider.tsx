"use client";

import React, { useEffect } from "react";
import posthog from "posthog-js";

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    const host = process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com";

    if (key && typeof window !== "undefined" && !posthog.__loaded) {
      posthog.init(key, {
        api_host: host,
        session_recording: {
          recordCrossOriginIframes: true,
        },
        capture_pageview: true,
        autocapture: true,
      });
    }
  }, []);

  return <>{children}</>;
}

