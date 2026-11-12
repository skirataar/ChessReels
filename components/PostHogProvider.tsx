"use client";

import { useEffect, useRef } from "react";
import posthog from "posthog-js";
import { isGuestAccount } from "@/lib/guestAccount";

type StoredAccount = {
  id: string;
  email?: string;
  displayName?: string;
  username?: string;
  plan?: string;
};

function readStoredAccount(): StoredAccount | null {
  try {
    const rawAccount = window.localStorage.getItem("chess_reel_account");
    if (!rawAccount) return null;

    const account = JSON.parse(rawAccount) as StoredAccount;
    return typeof account.id === "string" && account.id && !isGuestAccount(account)
      ? account
      : null;
  } catch {
    return null;
  }
}

export function PostHogIdentity() {
  const identifiedUserId = useRef<string | null>(null);

  useEffect(() => {
    const identifyStoredAccount = () => {
      const account = readStoredAccount();
      if (!account || identifiedUserId.current === account.id) return;

      try {
        const previousUserId = posthog.get_property("$user_id");
        if (previousUserId && previousUserId !== account.id) {
          posthog.reset();
        }

        posthog.identify(account.id, {
          ...(account.email ? { email: account.email } : {}),
          ...(account.displayName ? { name: account.displayName } : {}),
          ...(account.username ? { username: account.username } : {}),
          ...(account.plan ? { plan: account.plan } : {}),
        });
        identifiedUserId.current = account.id;
      } catch {
        // Analytics must not interrupt account restoration.
      }
    };

    identifyStoredAccount();
    window.addEventListener("account-updated", identifyStoredAccount);
    return () => window.removeEventListener("account-updated", identifyStoredAccount);
  }, []);

  return null;
}
