"use client";

import React from "react";
import { SettingsView } from "@/components/SettingsView";

export interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  userAccount?: any;
  guestId?: string;
  onSignOut?: () => void;
  onResetElo?: () => void;
  onOpenUpgrade?: () => void;
}

export function SettingsModal({
  isOpen,
  onClose,
  userAccount,
  guestId = "guest",
  onSignOut,
  onResetElo,
  onOpenUpgrade,
}: SettingsModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-label="Settings"
    >
      <div className="w-full max-w-md h-[92vh] sm:h-[88vh] flex flex-col rounded-2xl bg-[#0a0908] border border-white/10 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <SettingsView
          onBack={onClose}
          userAccount={userAccount}
          guestId={guestId}
          onSignOut={onSignOut}
          onResetElo={onResetElo}
          onOpenUpgrade={onOpenUpgrade}
        />
      </div>
    </div>
  );
}
