export function trackEvent(event: string, properties?: Record<string, any>) {
  if (typeof window === "undefined") return;
  try {
    const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    if (posthogKey && (window as any).posthog) {
      (window as any).posthog.capture(event, properties);
    }
  } catch (err) {
    // Silently swallow analytics errors so core user actions are never interrupted
  }
}
