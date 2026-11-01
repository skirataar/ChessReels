/**
 * Mobile vibration and haptic feedback utility for Chess Reel.
 * Uses navigator.vibrate with capability guards and safe try/catch.
 */

export const haptics = {
  /**
   * Subtle single pulse for a correct move (50ms)
   */
  success: () => {
    try {
      if (typeof window !== "undefined" && "vibrate" in navigator) {
        navigator.vibrate(50);
      }
    } catch {
      // Unsupported or blocked by user gesture policy
    }
  },

  /**
   * Distinct double-buzz pattern for an incorrect move (50ms on, 50ms pause, 50ms on)
   */
  error: () => {
    try {
      if (typeof window !== "undefined" && "vibrate" in navigator) {
        navigator.vibrate([50, 50, 50]);
      }
    } catch {
      // Unsupported
    }
  },

  /**
   * Light pulse for button taps
   */
  tap: () => {
    try {
      if (typeof window !== "undefined" && "vibrate" in navigator) {
        navigator.vibrate(25);
      }
    } catch {
      // Unsupported
    }
  },
};
