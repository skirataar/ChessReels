"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Play, Target, User, Settings } from "lucide-react";
import { SettingsModal } from "@/components/SettingsModal";
import { haptics } from "@/lib/haptics";
import { isGuestAccount } from "@/lib/guestAccount";
import { clearAllUserAndPuzzleCache } from "@/lib/puzzleCache";
import posthog from "posthog-js";

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const NAV_ITEMS: NavItem[] = [
  {
    name: "Play",
    href: "/play",
    icon: Play,
  },
  {
    name: "Practice",
    href: "/practice",
    icon: Target,
  },
  {
    name: "Profile",
    href: "/stats",
    icon: User,
  },
  {
    name: "Settings",
    href: "#settings",
    icon: Settings,
  },
];

export function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [hasMounted, setHasMounted] = useState<boolean>(false);
  const [isPro, setIsPro] = useState<boolean>(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLandingShowing, setIsLandingShowing] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [userAccount, setUserAccount] = useState<any>(null);
  const [avatarError, setAvatarError] = useState<boolean>(false);

  useEffect(() => {
    setAvatarError(false);
  }, [userAccount]);

  useEffect(() => {
    const handleLandingVisibility = (e: Event) => {
      const detail = (e as CustomEvent<{ visible?: boolean }>).detail;
      setIsLandingShowing(Boolean(detail?.visible));
    };
    const handleOpenSettings = () => {
      setIsSettingsOpen(true);
    };

    window.addEventListener("landing-visibility", handleLandingVisibility);
    window.addEventListener("open-settings-modal", handleOpenSettings);
    return () => {
      window.removeEventListener("landing-visibility", handleLandingVisibility);
      window.removeEventListener("open-settings-modal", handleOpenSettings);
    };
  }, []);

  useEffect(() => {
    setHasMounted(true);
    const checkState = () => {
      try {
        const plan = window.localStorage.getItem("chess_reel_plan");
        const accRaw = window.localStorage.getItem("chess_reel_account");
        let accPlan: string | undefined;
        let registered = false;
        if (accRaw) {
          try {
            const parsed = JSON.parse(accRaw);
            if (isGuestAccount(parsed)) {
              setUserAccount(null);
            } else {
              setUserAccount(parsed);
              accPlan = parsed?.plan;
              registered = Boolean(parsed?.id);
            }
          } catch {}
        } else {
          setUserAccount(null);
        }
        setIsAuthenticated(registered);
        setIsPro(plan === "premium" || accPlan === "premium");
      } catch {
        setIsAuthenticated(false);
        setIsPro(false);
      }
    };

    checkState();
    window.addEventListener("storage", checkState);
    window.addEventListener("account-updated", checkState);
    window.addEventListener("plan-updated", checkState);
    return () => {
      window.removeEventListener("storage", checkState);
      window.removeEventListener("account-updated", checkState);
      window.removeEventListener("plan-updated", checkState);
    };
  }, []);

  // Hide dock on admin console, unauthenticated visitors, and landing page
  if (
    !hasMounted ||
    pathname?.startsWith("/admin") ||
    !isAuthenticated ||
    pathname === "/" ||
    isLandingShowing
  ) {
    return null;
  }

  const handleNavClick = (e: React.MouseEvent, href: string) => {
    haptics.trigger("button");
    if (href === "#settings") {
      e.preventDefault();
      setIsSettingsOpen(true);
      return;
    }
    if (!isAuthenticated) {
      e.preventDefault();
      window.dispatchEvent(
        new CustomEvent("open-auth-modal", { detail: { tab: "login" } })
      );
      return;
    }
    if (href === "/stats" && (pathname === "/play" || pathname === "/")) {
      e.preventDefault();
      window.dispatchEvent(new Event("open-profile-modal"));
      return;
    }
    if (href === "/practice" && !isPro) {
      e.preventDefault();
      window.dispatchEvent(
        new CustomEvent("open-quota-paywall", { detail: { reason: "practice" } })
      );
      return;
    }
  };

  return (
    <>
      <nav
        aria-label="Bottom Navigation"
        className="fixed bottom-0 left-1/2 -translate-x-1/2 z-40 w-full max-w-[480px] h-14 bg-[#0a0908]/95 backdrop-blur-xl border-t border-white/[0.07] px-4 flex items-center justify-around rounded-t-2xl shadow-[0_-10px_30px_rgba(0,0,0,0.8)]"
      >
        <div className="w-full h-full grid grid-cols-4 items-center">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive =
              (item.href === "#settings" && isSettingsOpen) ||
              (item.href === "/play" && (pathname === "/" || pathname === "/play") && !isSettingsOpen) ||
              (item.href === "/practice" && pathname === "/practice" && !isSettingsOpen) ||
              (item.href === "/stats" && (pathname === "/stats" || pathname === "/profile") && !isSettingsOpen);

            const isProfile = item.name === "Profile";
            const userImage = userAccount?.image || userAccount?.avatarUrl || userAccount?.avatar;

            return (
              <Link
                key={item.href}
                href={item.href}
                data-testid={`bottom-nav-${item.name.toLowerCase()}`}
                data-nav-item={item.name.toLowerCase()}
                onClick={(e) => handleNavClick(e, item.href)}
                className={`relative h-full flex flex-col items-center justify-center gap-1 transition-colors select-none group cursor-pointer ${
                  isActive ? "text-[#c29b78]" : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                {isActive && (
                  <span className="absolute top-0 w-6 h-[2px] rounded-full bg-[#c29b78] shadow-[0_0_8px_rgba(194,155,120,0.6)]" />
                )}

                <div className="relative flex items-center justify-center">
                  {isProfile ? (
                    userImage && !avatarError ? (
                      <img
                        src={userImage}
                        alt="Profile"
                        data-testid="bottom-nav-profile-avatar"
                        onError={() => setAvatarError(true)}
                        className={`w-5 h-5 rounded-full object-cover transition-all ${
                          isPro
                            ? "ring-1.5 ring-[#c29b78] shadow-[0_0_6px_rgba(194,155,120,0.35)]"
                            : isActive
                            ? "ring-1.5 ring-[#c29b78]"
                            : "ring-1 ring-white/20"
                        }`}
                      />
                    ) : (
                      <div
                        data-testid="bottom-nav-profile-avatar"
                        className={`w-5 h-5 rounded-full flex items-center justify-center transition-all ${
                          isPro
                            ? "ring-1.5 ring-[#c29b78] text-[#c29b78] shadow-[0_0_6px_rgba(194,155,120,0.35)]"
                            : isActive
                            ? "ring-1.5 ring-[#c29b78] text-[#c29b78]"
                            : "ring-1 ring-white/20 text-zinc-500 group-hover:text-zinc-300"
                        }`}
                      >
                        <User className="w-3.5 h-3.5" strokeWidth={1.75} />
                      </div>
                    )
                  ) : (
                    <Icon
                      className={`w-4 h-4 transition-transform duration-200 ${
                        isActive
                          ? "stroke-[2.2] text-[#c29b78]"
                          : "stroke-[1.8] text-zinc-500 group-hover:text-zinc-300"
                      }`}
                    />
                  )}
                  {hasMounted && item.href === "/practice" && !isPro && (
                    <span
                      data-testid="bottom-nav-practice-lock"
                      className="absolute -top-1.5 -right-5 px-1 py-[1px] text-[8px] font-bold tracking-widest uppercase rounded bg-[#c29b78]/15 text-[#c29b78] border border-[#c29b78]/30"
                      title="Pro only"
                    >
                      PRO
                    </span>
                  )}
                </div>

                <span
                  className={`text-[10px] tracking-wider uppercase transition-colors ${
                    isActive ? "font-semibold text-[#c29b78]" : "font-medium text-zinc-500 group-hover:text-zinc-300"
                  }`}
                >
                  {item.name}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        userAccount={userAccount}
        onSignOut={() => {
          posthog.reset();
          clearAllUserAndPuzzleCache(userAccount?.id);
          if (typeof window !== "undefined") {
            try {
              window.localStorage.removeItem("chessreels_user_stats_v1");
              window.localStorage.removeItem("quota_last_check");
              window.localStorage.removeItem("chess_reel_account");
              window.localStorage.removeItem("chess_reel_tier_config");
              window.sessionStorage.clear();
            } catch {}
          }
          if (typeof document !== "undefined") {
            document.cookie = "chess_reel_session=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT";
          }
          setIsSettingsOpen(false);
          if (typeof window !== "undefined") {
            window.location.href = "/";
          } else {
            router.replace("/");
          }
        }}
      />
    </>
  );
}
