"use client";

import React, { useEffect } from "react";

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;

  useEffect(() => {
    if (!posthogKey || !posthogKey.trim() || typeof window === "undefined") {
      return;
    }

    try {
      import("posthog-js")
        .then(({ default: posthog }) => {
          if (!posthog.__loaded) {
            const host =
              process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com";
            posthog.init(posthogKey, {
              api_host: host,
              session_recording: {
                recordCrossOriginIframes: true,
              },
              capture_pageview: true,
              autocapture: true,
            });
          }
        })
        .catch(() => {
          // Silently swallow dynamic import failures (e.g. adblockers)
        });
    } catch {
      // Silently swallow analytics init errors
    }
  }, [posthogKey]);

  if (!posthogKey || !posthogKey.trim()) {
    return <>{children}</>;
  }

  return <>{children}</>;
}
