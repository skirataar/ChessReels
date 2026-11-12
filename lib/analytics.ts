import posthog from "posthog-js";

export function trackEvent(event: string, properties?: Record<string, any>) {
  if (typeof window === "undefined") return;

  try {
    posthog.capture(event, properties);
  } catch {
    // Silently swallow analytics errors so core user actions are never interrupted
  }
}
