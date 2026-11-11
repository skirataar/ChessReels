import posthog from "posthog-js";

export type AnalyticsEvent =
  | "landing_viewed"
  | "puzzle_1_solved"
  | "puzzle_3_solved"
  | "signup_completed";

export function trackEvent(
  event: AnalyticsEvent,
  properties?: Record<string, any>
) {
  if (typeof window !== "undefined" && process.env.NEXT_PUBLIC_POSTHOG_KEY) {
    posthog.capture(event, properties);
  }
}

