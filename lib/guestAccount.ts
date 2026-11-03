export const GUEST_DISPLAY_NAME = "Guest Tactician";

export function isGuestUserId(id?: string | null): boolean {
  if (!id) return true;
  return (
    id === "guest-user" ||
    id === "anonymous-guest" ||
    id.startsWith("guest_") ||
    id.startsWith("guest-")
  );
}

export function isGuestAccount(account: unknown): boolean {
  if (!account || typeof account !== "object") return true;
  const a = account as Record<string, unknown>;
  const id = typeof a.id === "string" ? a.id : "";
  if (isGuestUserId(id)) return true;
  if (a.displayName === GUEST_DISPLAY_NAME) return true;

  const username = typeof a.username === "string" ? a.username : "";
  const hasIdentity = Boolean(a.email || a.googleId);
  if (!hasIdentity && /^tactician_\d+$/.test(username)) return true;

  return false;
}

export function clearGuestLocalSession(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem("chess_reel_account");
    window.localStorage.removeItem("chess_reel_preview_guest");
    window.localStorage.removeItem("chess_reel_guest_id");
    window.localStorage.removeItem("chess_reel_username");
    window.localStorage.removeItem("chess_reel_tier_session_guest");
    document.cookie = "chess_reel_session=; path=/; max-age=0";
    window.dispatchEvent(new Event("account-updated"));
    window.dispatchEvent(new Event("plan-updated"));
    window.dispatchEvent(new Event("tier-session-updated"));
  } catch {}
}
