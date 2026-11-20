import React from "react";
import Link from "next/link";
import { Shield, FileText, BookOpen, Mail, Info } from "lucide-react";

export function PublicFooter() {
  return (
    <footer className="w-full border-t border-white/[0.08] bg-[#0c0b0a] text-zinc-400 py-10 px-4 mt-auto">
      <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6 text-xs">
        <div className="flex items-center gap-2.5">
          <img
            src="/icons/icon-v2.svg?v=2"
            alt="DoomChess Logo"
            className="w-6 h-6 rounded-md object-contain"
          />
          <div className="flex flex-col">
            <span className="font-black text-sm text-[#f5f2eb] tracking-tight">
              Doom<span className="text-[#c29b78]">Chess</span>
            </span>
            <span className="text-[10px] text-zinc-500 font-mono">
              6.15M+ Verified Tactical Puzzles
            </span>
          </div>
        </div>

        <nav
          aria-label="Footer Navigation"
          className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-zinc-400"
        >
          <Link
            href="/guides"
            className="hover:text-[#c29b78] transition-colors flex items-center gap-1.5"
          >
            <BookOpen className="w-3.5 h-3.5 stroke-[1.8] text-[#c29b78]" />
            <span>Tactical Guides</span>
          </Link>
          <Link
            href="/about"
            className="hover:text-[#c29b78] transition-colors flex items-center gap-1.5"
          >
            <Info className="w-3.5 h-3.5 stroke-[1.8] text-[#c29b78]" />
            <span>About</span>
          </Link>
          <Link
            href="/privacy-policy"
            className="hover:text-[#c29b78] transition-colors flex items-center gap-1.5"
          >
            <Shield className="w-3.5 h-3.5 stroke-[1.8] text-[#c29b78]" />
            <span>Privacy Policy</span>
          </Link>
          <Link
            href="/terms"
            className="hover:text-[#c29b78] transition-colors flex items-center gap-1.5"
          >
            <FileText className="w-3.5 h-3.5 stroke-[1.8] text-[#c29b78]" />
            <span>Terms</span>
          </Link>
          <Link
            href="/contact"
            className="hover:text-[#c29b78] transition-colors flex items-center gap-1.5"
          >
            <Mail className="w-3.5 h-3.5 stroke-[1.8] text-[#c29b78]" />
            <span>Contact</span>
          </Link>
        </nav>

        <div className="text-[11px] text-zinc-500 font-mono text-center sm:text-right">
          <span>&copy; 2026 DoomChess. All rights reserved.</span>
        </div>
      </div>
    </footer>
  );
}
