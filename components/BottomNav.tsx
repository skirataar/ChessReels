"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Play, Target, BarChart2 } from "lucide-react";
import { motion } from "framer-motion";

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
    name: "Stats",
    href: "/stats",
    icon: BarChart2,
  },
];

export function BottomNav() {
  const pathname = usePathname();

  // If on landing or auth redirect, still show or render appropriately
  return (
    <nav
      aria-label="Bottom Navigation"
      className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-center pointer-events-none pb-safe"
    >
      <div className="w-full max-w-md mx-auto px-4 pb-3 pt-1 pointer-events-auto">
        <div className="relative flex items-center justify-around h-16 rounded-2xl bg-[#22201e]/90 backdrop-blur-xl border border-white/10 shadow-2xl shadow-black/80 px-3">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive =
              pathname === item.href ||
              (item.href === "/play" && (pathname === "/" || pathname === "/play"));

            return (
              <Link
                key={item.href}
                href={item.href}
                className="relative flex-1 flex flex-col items-center justify-center py-1 transition-all duration-200 select-none group"
              >
                <motion.div
                  whileTap={{ scale: 0.92 }}
                  animate={
                    isActive
                      ? {
                          scale: 1.08,
                          y: -2,
                        }
                      : { scale: 1, y: 0 }
                  }
                  transition={{ type: "spring", stiffness: 400, damping: 25 }}
                  className={`flex flex-col items-center gap-1 px-4 py-1.5 rounded-xl transition-colors ${
                    isActive
                      ? "text-[#c29b78] bg-[#c29b78]/15 shadow-[0_0_16px_rgba(194,155,120,0.25)] border border-[#c29b78]/30"
                      : "text-[#a3a3a3] hover:text-[#f5f5f5]"
                  }`}
                >
                  <Icon
                    className={`w-5 h-5 transition-transform duration-200 ${
                      isActive
                        ? "stroke-[2.5] text-[#c29b78] fill-[#c29b78]/20"
                        : "stroke-[2] text-[#a3a3a3] group-hover:text-[#f5f5f5]"
                    }`}
                  />
                  <span
                    className={`text-[11px] font-bold tracking-wide ${
                      isActive ? "text-[#c29b78]" : "text-[#a3a3a3] group-hover:text-[#f5f5f5]"
                    }`}
                  >
                    {item.name}
                  </span>
                </motion.div>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
