"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Play, Target, User, Lock, Settings } from "lucide-react";
import { motion } from "framer-motion";
import { SettingsModal } from "@/components/SettingsModal";
import { isGuestAccount } from "@/lib/guestAccount";

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
        className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-center pointer-events-none pb-safe"
      >
        <div className="w-full max-w-[360px] sm:max-w-[380px] mx-auto px-2 pb-2 pt-0.5 pointer-events-auto">
          <div className="relative flex items-center justify-around h-12 rounded-full bg-[#201e1d]/95 backdrop-blur-xl border border-white/10 shadow-xl shadow-black/80 px-2">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive =
                (item.href === "#settings" && isSettingsOpen) ||
                (item.href === "/play" && (pathname === "/" || pathname === "/play") && !isSettingsOpen) ||
                (item.href === "/practice" && pathname === "/practice" && !isSettingsOpen) ||
                (item.href === "/stats" && (pathname === "/stats" || pathname === "/profile") && !isSettingsOpen);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  data-testid={`bottom-nav-${item.name.toLowerCase()}`}
                  data-nav-item={item.name.toLowerCase()}
                  onClick={(e) => handleNavClick(e, item.href)}
                  className="relative flex-1 flex flex-col items-center justify-center py-0.5 transition-all duration-200 select-none group"
                >
                  <motion.div
                    whileTap={{ scale: 0.94 }}
                    animate={
                      isActive
                        ? {
                            scale: 1.04,
                            y: -1,
                          }
                        : { scale: 1, y: 0 }
                    }
                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                    className={`flex flex-col items-center gap-0.5 px-2.5 py-1 rounded-full transition-colors ${
                      isActive
                        ? "text-[#c29b78] bg-[#c29b78]/15 shadow-[0_0_12px_rgba(194,155,120,0.2)] border border-[#c29b78]/30"
                        : "text-[#a3a3a3] hover:text-[#f5f5f5]"
                    }`}
                  >
                    <div className="relative">
                      <Icon
                        className={`w-4 h-4 transition-transform duration-200 ${
                          isActive
                            ? "stroke-[2.5] text-[#c29b78] fill-[#c29b78]/20"
                            : "stroke-[2] text-[#a3a3a3] group-hover:text-[#f5f5f5]"
                        }`}
                      />
                      {hasMounted && item.href === "/practice" && !isPro && (
                        <span
                          data-testid="bottom-nav-practice-lock"
                          className="absolute -top-1 -right-1.5 px-1 py-0.2 rounded-full bg-amber-500 text-[7px] font-black text-zinc-950 flex items-center justify-center border border-[#22201e] shadow-sm"
                          title="Pro only"
                        >
                          <Lock className="w-1.5 h-1.5" />
                        </span>
                      )}
                    </div>
                    <span
                      className={`text-[10px] font-bold tracking-tight flex items-center gap-1 ${
                        isActive ? "text-[#c29b78]" : "text-[#a3a3a3] group-hover:text-[#f5f5f5]"
                      }`}
                    >
                      <span>{item.name}</span>
                    </span>
                  </motion.div>
                </Link>
              );
            })}
          </div>
        </div>
      </nav>

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        userAccount={userAccount}
      />
    </>
  );
}
